import { ExternalLink, FolderLock } from "lucide-react";
import CopyButton from "./CopyButton.jsx";
import Reveal from "./Reveal.jsx";
import { siteConfig } from "../config/siteConfig.js";

/** The Google Drive folder link with Copy + Open buttons and the "request access" note. */
export default function DriveLinkCard({ link, heading = siteConfig.upload.driveHeading }) {
  if (!link) {
    return (
      <Reveal className="card-royal rounded-3xl p-6 text-center text-ink/80">
        <FolderLock className="mx-auto mb-2 text-secondary" aria-hidden="true" />
        The Google Drive folder link will appear here once the host connects Drive.
      </Reveal>
    );
  }
  return (
    <Reveal className="card-royal rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-secondary/15 p-2 text-secondary">
          <FolderLock size={22} aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-secondary sm:text-2xl">{heading}</h2>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block truncate rounded-xl border border-secondary/30 bg-primary-deeper/50 px-4 py-3 font-mono text-sm text-third-soft hover:border-third"
      >
        {link}
      </a>
      <div className="mt-4 flex flex-wrap gap-3">
        <CopyButton text={link} label="Copy link" />
        <a href={link} target="_blank" rel="noopener noreferrer" className="btn-outline">
          <ExternalLink size={18} aria-hidden="true" /> Open in Drive
        </a>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink/75">{siteConfig.upload.driveNote}</p>
    </Reveal>
  );
}
