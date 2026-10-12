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
