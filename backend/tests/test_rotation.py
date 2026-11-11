from app.index import select_rotation


def test_fewer_than_page_size_returns_all():
    ids = [f"p{i}" for i in range(7)]
    chosen, ends_at = select_rotation(ids, now_epoch=1000, rotate_seconds=1200, page_size=10)
    assert chosen == ids
    assert ends_at == 1200


def test_same_window_same_result():
    ids = [f"p{i}" for i in range(37)]
    a, _ = select_rotation(ids, 5000, 1200, 10)
    b, _ = select_rotation(ids, 5999, 1200, 10)
    assert a == b and len(a) == 10


def test_cycle_covers_every_photo_before_repeating():
    ids = [f"p{i}" for i in range(37)]
    pages = 4  # ceil(37/10)
    seen = []
    for page in range(pages):
        chosen, _ = select_rotation(ids, page * 1200 + 1, 1200, 10)
        seen.extend(chosen)
    assert sorted(seen) == sorted(ids)
    assert len(seen) == len(set(seen))


def test_next_cycle_is_reshuffled():
    ids = [f"p{i}" for i in range(50)]
    first, _ = select_rotation(ids, 0, 1200, 10)
    later, _ = select_rotation(ids, 5 * 1200, 1200, 10)  # page 0 of cycle 1
    assert first != later
