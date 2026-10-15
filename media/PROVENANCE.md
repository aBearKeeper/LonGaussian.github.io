# Media provenance

MP4 and WebM comparison videos were encoded from unmodified original evaluation
RGB files, using `figures/comparison_videos/full_sequence_provenance.json`. Frames
retain their original order and include context and held-out views. CTX/NVS badges
identify each frame. Playback is 8 frames/s for viewing, not rendering throughput.
Panels: GT / ReCoSplat official / ReCoSplat adapted / OF3GS / Ours.

Figures and the PDF come from the current paper directory. Interactive Gaussian
rendering is documented in `geometry/PROVENANCE.md` and built separately with
`tools/export_final_scene.py` and `tools/compress_scene.mjs`.

The comparison videos remain the original evaluation renderings. The three
interactive scenes were newly inferred on GPU1 and verified before integration,
as documented in geometry/PROVENANCE.md. No color correction, frame interpolation
or image retouching was performed.

## Long-sequence overview video

`videos/long-sequence-teaser-v14.webm` and `.mp4` are byte-identical copies of the
validated v14 preview exports. `videos/long-sequence-teaser-v14-720p.mp4` is the
presentation export. All last 42.7 seconds and retain the actual paper-method
closing page at 37.7–42.7 seconds. The three selected walkthroughs each last
5.5 seconds, spanning source ranges 250–670, 850–1180 and 1446–1836. The poster
is output frame 134 of the same edit. No extra trimming or appearance editing
was applied for the website.

The overview uses a full global-scene orbit followed by selected local
three-chunk renderings. The OF3GS comparison retains each model's own estimated
cameras and the measured capacity / pose-error annotations. It is a selected
visualization, not a full-global-scene rendering benchmark. Exact source files,
sizes and SHA-256 hashes are recorded in `overview-video.json`.
