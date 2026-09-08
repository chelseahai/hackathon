/* Verbatim excerpts from the existing Python implementation. */
window.BodiceExcerpts = [
  {
    "source": "BasicBlock-Bodice/draft.py",
    "line": 451,
    "code": "    total_width = p.bust / 2.0 + p.width_ease\n    armhole_depth = p.bust / 6.0 + p.armhole_depth_add\n    back_width = p.bust / 6.0 + p.back_width_add\n    chest_width = p.bust / 6.0 + p.chest_width_add"
  },
  {
    "source": "BasicBlock-Bodice/draft.py",
    "line": 469,
    "code": "\n    bnw = p.bust / p.neck_unit_div\n    bnh = bnw / 3.0\n    fnw = bnw - p.front_neck_width_minus\n    fnd = bnw + p.front_neck_depth_add\n\n    cb_neck = Vec2(cb_x, top_y)\n    back_snp = Vec2(bnw, top_y + bnh)\n    back_shoulder = Vec2(back_width_x + p.back_shoulder_out, top_y - bnh)\n    back_shoulder_len = (back_shoulder - back_snp).length()\n    front_shoulder_len = back_shoulder_len - p.front_shoulder_shorter\n\n    cf_neck = Vec2(cf_x, top_y - fnd)\n    front_snp = Vec2(cf_x - fnw, top_y - p.front_side_neck_drop)\n    neck_corner = Vec2(cf_x - fnw, top_y - fnd)"
  },
  {
    "source": "BasicBlock-Bodice/draft.py",
    "line": 523,
    "code": "    samples = p.spline_samples\n    back_neck = arc_horizontal_at_start(cb_neck, back_snp, samples)\n    front_neck = interpolate([front_snp, front_neck_offset, cf_neck], samples)\n    back_armhole = interpolate(\n        [back_shoulder, back_ah_mid, back_ah_bisector, underarm], samples\n    )\n    front_armhole = interpolate(\n        [underarm, front_ah_bisector, front_ah_mid, front_shoulder], samples\n    )"
  },
  {
    "source": "BasicBlock-Bodice/draft.py",
    "line": 498,
    "code": "    underarm = Vec2(side_x, bl_y)\n    side_waist = Vec2(side_x - p.side_seam_to_back, wl_y)\n    cb_waist = Vec2(cb_x, wl_y)\n\n    bp = Vec2((chest_width_x + cf_x) / 2.0 - p.bp_to_armhole, bl_y - p.bp_below_bl)\n    cf_hem = Vec2(cf_x, wl_y - fnw / 2.0)\n    hem_at_bp = Vec2(bp.x, cf_hem.y)"
  }
];
