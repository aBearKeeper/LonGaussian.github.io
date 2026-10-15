# Media provenance

MP4 and WebM comparison videos were encoded from unmodified original evaluation
RGB files, using `figures/comparison_videos/full_sequence_provenance.json`. Frames
retain their original order and include context and held-out views. CTX/NVS badges
identify each frame. Playback is 8 frames/s for viewing, not rendering throughput.
Panels: GT / ReCoSplat official / ReCoSplat adapted / OF3GS / Ours.

The method and scene figures and the PDF come from the current paper directory. Interactive Gaussian
rendering is documented in `geometry/PROVENANCE.md` and built separately with
`tools/export_final_scene.py` and `tools/compress_scene.mjs`.

The comparison videos remain the original evaluation renderings. The three
interactive scenes were newly inferred on GPU1 and verified before integration,
as documented in geometry/PROVENANCE.md. No color correction, frame interpolation
or image retouching was performed.

## Long-sequence overview video

`videos/long-sequence-teaser-v15.webm` and `.mp4` are byte-identical copies of the
validated v15 preview exports. `videos/long-sequence-teaser-v15-720p.mp4` is the
presentation export. All last 43.5 seconds and retain the actual paper-method
closing page at 38.5–43.5 seconds. The opening is a dynamic cover: the full title,
five authors and affiliation remain visible alongside the actual input film.
The final 128 input frames last 1.5 seconds and brake to a stop; an eased
half-second dissolve leads into the global Gaussian scene. The poster is the
actual first frame of the video.

All v14 content from the global orbit through the method ending retains the
same frame order and playback speed, shifted by 0.8 seconds. The three selected
walkthroughs each remain 5.5 seconds, spanning source ranges 250–670, 850–1180
and 1446–1836. No scene appearance correction or interpolation was applied.

The overview uses a full global-scene orbit followed by selected local
three-chunk renderings. The OF3GS comparison retains each model's own estimated
cameras and the measured capacity / pose-error annotations. It is a selected
visualization, not a full-global-scene rendering benchmark. Exact source files,
sizes and SHA-256 hashes are recorded in `overview-video.json`.

## Website resource curves

`images/scalability-resources.svg` and its stacked mobile version are dedicated
website figures. They use the same six measurements as the paper resource plot,
without smoothing, extrapolation, or changes to the recorded values. Both axes
use linear scales. Panels (a)–(c) report peak allocated GPU memory, streaming
construction time (converted from seconds to minutes), and the prefix-filtered
compact representation plus dense complement (millions of Gaussians).

Exact measurements, definitions, source paths, and source hashes are in
`scalability-resources.json`. Rebuild the SVG and PNG exports with
`python tools/plot_scalability.py` from the website directory (requires matplotlib).
