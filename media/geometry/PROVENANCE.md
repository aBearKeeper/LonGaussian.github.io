# Interactive Gaussian reconstructions

The website now offers three complete final reconstructions, rather than the
previous single corridor chunk. Paths below are relative to the research workspace.

| Website scene | Context views | Inference output | Source Gaussians | Browser Gaussians | KSPLAT bytes |
| --- | ---: | --- | ---: | ---: | ---: |
| Sculpture garden (ff592398) | 64 | results/project_page_b1_ctx64_gpu1_20261012_final | 1,922,031 | 1,891,054 | 136,348,772 |
| Domed courtyard (c076929d) | 96 | results/project_page_c076929d_ctx96_gpu1_20261012 | 1,508,521 | 1,497,187 | 107,987,748 |
| Furniture showroom (374ffd0c) | 96 | results/project_page_374ffd0c_ctx96_gpu1_20261012 | 2,337,570 | 2,246,533 | 161,874,632 |

Each output saves the complete final scene after the inference pipeline's
rendered-depth filter and sky-shell handling, in final_scene.pt. The original
inference logs, export_provenance.json, configuration, and reference renders
remain in the corresponding result directory. There is no point subsampling or
spatial crop. Export excludes opacity <= 0.01, matching the native renderer's
existing threshold; no additional browser opacity threshold is applied.

All means, anisotropic scales, wxyz quaternions, opacity and degree-2 spherical
harmonics are retained. A shared translation centers each scene at the reference
camera; no scaling or appearance correction is applied. The initial camera uses
frame 23 for the garden and frame 55 for the other two scenes. Metadata preserves
camera position, up vector, look-at target and intrinsics, including unequal fx
and fy. Internal filesystem paths are omitted from published metadata.

Export: tools/export_final_scene.py; compression: tools/compress_scene.mjs.
KSPLAT level 1 quantizes Gaussian attributes and SH to float16 and alpha/color
to uint8. Each part contains at most one million Gaussians and is under 100 MiB.
Parts load together and sort globally in one viewer. No SH bands are discarded.

The browser uses locally vendored GaussianSplats3D 0.4.7 and Three.js 0.160.0,
with their MIT licenses. It renders anisotropic Gaussian ellipses with depth
sorting, alpha compositing and view-dependent SH colors, rather than point
centers. GPU covariances use float32. splat-viewer.js applies two projection
shader fixes: replace an eigenvalue discriminant floor of 0.1 with 0, which
otherwise discards valid small splats, and handle diagonal covariance matrices
without normalizing a zero eigenvector. Original Gaussian attributes are unchanged.

All three independent previews were compared against native reference-camera
renders before integration. Public poster.jpg files are screenshots of those
verified browser renderings, encoded as JPEG without retouching. Interactions
are intended for nearby viewpoints within the observed camera coverage; these
scenes do not establish arbitrary-view quality or long-range loop closure.
