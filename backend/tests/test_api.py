from tests.conftest import make_heic, make_jpeg

PASS = {"X-Event-Passcode": "diya123"}
ADMIN = {"X-Admin-Token": "admin-secret"}


def upload(client, data, name="a.jpg", mime="image/jpeg", headers=PASS):
    return client.post("/api/upload", files={"file": (name, data, mime)}, headers=headers)


def test_health_and_config(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    cfg = client.get("/api/config").json()
    assert cfg["passcode_required"] is True
    assert cfg["gallery_rotate_minutes"] == 20
    assert cfg["drive_folder_link"].endswith("root-folder")


def test_upload_requires_passcode(client):
    assert upload(client, make_jpeg(), headers={}).status_code == 401
    assert upload(client, make_jpeg(), headers={"X-Event-Passcode": "nope"}).status_code == 401
    assert client.post("/api/passcode/verify", headers=PASS).status_code == 200
    assert client.post("/api/passcode/verify").status_code == 401


def test_upload_jpeg_and_heic_then_gallery_and_streams(client, fake_drive):
    r1 = upload(client, make_jpeg())
    assert r1.status_code == 201, r1.text
    r2 = upload(client, make_heic(), name="IMG_0001.HEIC", mime="image/heic")
    assert r2.status_code == 201, r2.text
    assert r2.json()["format"] == "HEIF"

    # three Drive files per photo: original + medium + thumb
    assert len(fake_drive.files) == 6
    originals = [f for f in fake_drive.files.values() if f["parent"] == "root-folder"]
    assert sorted(f["name"].rsplit(".", 1)[1] for f in originals) == ["heic", "jpg"]

    g = client.get("/api/gallery").json()
    assert g["total"] == 2 and len(g["photos"]) == 2
    assert g["rotation_ends_at"] > g["server_time"]

    pid = r1.json()["id"]
    t = client.get(f"/api/photos/{pid}/thumb")
    assert t.status_code == 200 and t.headers["content-type"] == "image/jpeg"
    assert "immutable" in t.headers["cache-control"]
    m = client.get(f"/api/photos/{pid}/medium")
    assert m.status_code == 200 and len(m.content) > len(t.content)
    assert client.get("/api/photos/does-not-exist/thumb").status_code == 404


def test_upload_rejects_bad_content_and_wrong_extension_lies(client):
    r = upload(client, b"hello world, not an image", name="photo.jpg")
    assert r.status_code == 415
    # Real JPEG bytes with a misleading name still pass (content-based detection).
    r = upload(client, make_jpeg(), name="whatever.heic", mime="application/octet-stream")
    assert r.status_code == 201


def test_upload_too_large(client, settings):
    big = b"\xff\xd8" + b"0" * (settings.max_upload_bytes + 10)
    assert upload(client, big).status_code == 413


def test_partial_failure_cleans_up(client, fake_drive):
    fake_drive.fail_next_upload = True
    r = upload(client, make_jpeg())
    assert r.status_code == 502
    assert fake_drive.files == {}
    assert client.get("/api/gallery").json()["total"] == 0


def test_index_rebuild_from_drive(client, fake_drive):
    upload(client, make_jpeg())
    upload(client, make_jpeg(800, 800))
    # stray file in the main folder must be ignored
    fake_drive.upload_bytes(b"notes", "notes.txt", "text/plain", "root-folder")
    r = client.post("/api/admin/reindex", headers=ADMIN)
    assert r.status_code == 200 and r.json()["photos"] == 2


def test_admin_delete(client, fake_drive):
    pid = upload(client, make_jpeg()).json()["id"]
    assert client.delete(f"/api/admin/photos/{pid}").status_code == 401
    assert client.get("/api/admin/photos", headers=ADMIN).json()["total"] == 1
    r = client.delete(f"/api/admin/photos/{pid}", headers=ADMIN)
    assert r.status_code == 200
    assert fake_drive.files == {}
    assert client.get("/api/gallery").json()["total"] == 0
    assert client.get(f"/api/photos/{pid}/thumb").status_code == 404
