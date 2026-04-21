import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.patheffects as pe

# ===== Tuỳ chỉnh nhanh =====
vmin, vmax = -20, 35
tick_step = 5          # tăng lên 10 hoặc 15 để ít mốc hơn, chữ dễ to hơn
tick_fontsize = 30      # tăng cỡ chữ số
fig_w, fig_h = 14, 2.8  # tăng chiều cao để có chỗ cho chữ lớn
# ==========================

fig, ax = plt.subplots(figsize=(fig_w, fig_h))
fig.patch.set_alpha(0)   # 👈 nền toàn bộ figure trong suốt
ax.set_facecolor("none") # 👈 nền trục trong suốt
ax.axis("off")

cmap = mcolors.LinearSegmentedColormap.from_list(
    "salinity_like",
    ["#1f2aa5", "#1697c6", "#00d400", "#e6f000", "#ff8c00", "#cc0000"]
)
norm = mcolors.Normalize(vmin=vmin, vmax=vmax)

sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
sm.set_array([])

cbar = fig.colorbar(
    sm,
    ax=ax,
    orientation="horizontal",
    fraction=0.65,   # độ dày thanh màu
    pad=0.01
)

# Tick theo bước nhảy bạn muốn
ticks = np.arange(vmin, vmax + 0.001, tick_step)
cbar.set_ticks(ticks)
cbar.set_ticklabels([f"{int(t)}" for t in ticks])

# Phóng to chữ
cbar.ax.tick_params(labelsize=tick_fontsize, length=8, width=1.2, colors="0.85")

# text màu đen với viền trắng để nổi bật trên nền sáng
for lbl in cbar.ax.get_xticklabels():
    lbl.set_color("black")
    lbl.set_path_effects([
        pe.withStroke(linewidth=3, foreground="white")
    ])

# Viền thanh màu
cbar.outline.set_edgecolor("0.85")
cbar.outline.set_linewidth(1.5)

plt.tight_layout()
plt.show()