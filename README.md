# LonGaussian project page

静态项目页，没有构建步骤，可在本地运行或部署到 GitHub Pages。

## 下载和本地查看

下载整个 project-page 文件夹（或解压 project-page-yellow-v4.zip），保持目录结构：

- index.html、styles.css、script.js、splat-viewer.js、favicon.svg
- media/：所有视频、封面、图片、论文 PDF、场景清单和高斯数据
- vendor/：本地 Three.js 和 GaussianSplats3D 渲染器及许可证
- .nojekyll：GitHub Pages 的静态站点标记

在 project-page 文件夹内打开终端：

    python -m http.server 8000

macOS / Linux 若找不到 python，可使用 python3。浏览器打开 http://localhost:8000。
请通过 HTTP 服务查看，不要直接双击 HTML；交互组件需要读取本地 JSON 和二进制文件。
运行网页不需要 Node.js、推理环境或服务器 GPU。Inter 字体由 Google Fonts 提供；断网时使用系统字体。

如果更新网页后出现旧版蓝色标题、按钮图标异常放大等混合样式，先按 Ctrl+Shift+R
强制刷新。新版已为 CSS/JS 添加内容版本标识，避免沿用 localhost 上的旧缓存。
仍异常时，把下载包解压到一个全新目录，在该目录启动服务；也可改用端口 8001。

## 页面内容

- 实际渲染视频背景、论文信息和已核对的结果摘要。
- 首页完整概览视频：43.5 秒，全程白底，动态封面右上角使用作者提供的华科大横版校标；包含输入序列、全局场景、OF3GS 对比、加速漫游和 method 结尾，支持下载 720p MP4。
- Video results：DL3DV 与 RealEstate10K 共用一个拖动对比播放器，五个场景统一切换；支持 GT / OF3GS / ReCoSplat 参照。
- 与论文 Table 1 一致的可切换指标表。
- 长序列资源分析：专用金色 SVG 曲线，(a)–(c) 展示显存、耗时和高斯数量，手机自动改为竖排。
- 按需加载的真正高斯渲染（完整尺度、旋转、透明度及二阶球谐颜色），支持旋转、平移、缩放、重置和全屏。
- 论文图放大。

对比视频把五种方法的画面放在同一个视频帧中，再用 Canvas 截取，避免两段视频播放漂移。
视频包含 CTX 与 NVS 视角，页面显示当前帧类别；8 FPS 是展示速度，不是推理速度。
媒体在进入可视区域时加载/播放，离开或切换标签页时暂停。系统启用“减少动态效果”时不自动播放。
浏览器优先选择 WebM；提供 MP4 兼容回退。三维渲染需要支持 WebGL2 的浏览器并开启硬件加速；不需要服务器 GPU、特殊 HTTP 头或 CDN。
三维场景可切换：雕塑花园（64 context views，130 MiB）、穹顶广场（96 views，103 MiB）、
家具展厅（96 views，154 MiB）。每个场景为所选 context 序列的完整最终高斯场景，
首次点击 Explore in 3D 才下载；已加载后切换会释放旧场景，再加载新场景。
所有 KSPLAT 分片均小于 100 MiB，便于 GitHub 仓库托管。对比视频及三维区最大宽度为 588 px，
减少对 490×280 原始分辨率的放大。新概览视频最大宽度为 760 px，默认不预加载或自动播放，
提供 WebM / MP4 格式以及独立 720p 下载。

## 发布到 GitHub Pages

1. 新建一个公开仓库，例如 LonGaussian-page。
2. 将此目录的内容放在仓库根目录，保留 media/ 结构。
3. 在 Settings → Pages 中选择 Deploy from a branch。
4. 选择 main 分支、/ (root)，保存。
5. 网站通常位于 https://你的用户名.github.io/LonGaussian-page/ 。

发布前更新真实公开的论文/代码链接；Code (soon) 目前是不可点击的占位。
作者信息来自论文源文件；未声明会议录用，未编造 arXiv 编号。
页首和页脚保留真实作者及单位信息；引文暂不提供，待 arXiv 预印本公开后补充。

## 素材来源与维护

media/PROVENANCE.md 记录素材来源。当前视频从原始真实推理渲染帧重新编码，
未做色彩修复、补帧或结果修饰。三维预览由新推理保存的完整最终高斯参数导出，未修改外观；不抽样或空间裁剪，
仅排除原生渲染器不渲染的低透明度高斯。
细节见 media/geometry/PROVENANCE.md。

tools/prepare_media.py 与 tools/prepare_webm.py 重建视频和图片；
tools/plot_scalability.py 根据 media/scalability-resources.json 重建网页专用资源曲线；
tools/export_final_scene.py 与 tools/compress_scene.mjs 导出并分片压缩完整高斯场景。
这些工具用于原研究工作区，
运行网页不需要这些脚本。新增场景时同步更新 media/scenes.json；每个比较视频
按 GT / ReCoSplat official / ReCoSplat adapted / OF3GS / Ours 纵向排列。
