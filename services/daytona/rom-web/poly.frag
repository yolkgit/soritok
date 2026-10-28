#version 300 es
precision highp float;
precision highp int;
uniform highp usampler2D texram;
uniform highp usampler2D lumaram;
uniform highp usampler2D xlat;
in vec3 vOz;
flat in vec4 vColor;
flat in uvec4 vInfo;
flat in uvec2 vMore;
out vec4 outColor;
uint textureWord(uint i){return texelFetch(texram,ivec2(int(i&1023u),int(i>>10)),0).r;}
uint lumaWord(uint i){return texelFetch(lumaram,ivec2(int(i&255u),int(i>>8)),0).r;}
uint colorWord(uint i){return texelFetch(xlat,ivec2(int(i&255u),int(i>>8)),0).r;}
const uint log2_table[128] = uint[128](0u, 2u, 5u, 8u, 11u, 14u, 16u, 19u, 22u, 25u, 27u, 30u, 33u, 35u, 38u, 40u, 43u, 46u, 48u, 51u, 53u, 56u, 58u, 61u, 63u, 65u, 68u, 70u, 73u, 75u, 77u, 80u, 82u, 84u, 87u, 89u, 91u, 93u, 96u, 98u, 100u, 102u, 104u, 106u, 109u, 111u, 113u, 115u, 117u, 119u, 121u, 123u, 125u, 127u, 129u, 132u, 134u, 136u, 138u, 140u, 141u, 143u, 145u, 147u, 149u, 151u, 153u, 155u, 157u, 159u, 161u, 162u, 164u, 166u, 168u, 170u, 172u, 173u, 175u, 177u, 179u, 181u, 182u, 184u, 186u, 188u, 189u, 191u, 193u, 194u, 196u, 198u, 200u, 201u, 203u, 205u, 206u, 208u, 209u, 211u, 213u, 214u, 216u, 218u, 219u, 221u, 222u, 224u, 225u, 227u, 229u, 230u, 232u, 233u, 235u, 236u, 238u, 239u, 241u, 242u, 244u, 245u, 247u, 248u, 250u, 251u, 253u, 254u);

// raster.cpp fast_log2
int fast_log2(float value) {
    if (value < 0.0) return 0;
    uint ival = floatBitsToUint(value) >> 16;
    int e = int(ival >> 7) - 127;
    return (e << 8) | int(log2_table[ival & 127u]);
}

// x86 cvttss2si: NaN and out of range give INT32_MIN (raster.cpp to_s32)
int to_s32(float f) {
    if (!(f >= -2147483648.0 && f < 2147483648.0)) return int(0x80000000u);
    return int(f);
}

uint lerp8(uint x, uint y, uint a) { return (x + (((y - x) * a) >> 8)) & 0x00ff00ffu; } // raster.cpp LERP

// raster.cpp get_texel
uint get_texel(uint base_x, uint base_y, int x, int y, uint sheet) {
    int x2 = int(base_x) + x;
    int y2 = int(base_y) + y;
    if (x2 >= 1024) { // sheets are mapped 2048x1024, stored 1024x2048
        x2 -= 1024;
        y2 ^= 1024;
    }
    uint offset = uint((y2 / 2) * 512 + (x2 / 2));
    uint texel = textureWord(sheet * 0x80000u + ((offset >> 1) & 0x7ffffu));
    if ((offset & 1u) != 0u) texel >>= 16;
    if ((y & 1) == 0) texel >>= 8;
    if ((x & 1) == 0) texel >>= 4;
    return texel & 0x0fu;
}

// raster.cpp fetch_bilinear_texel; level -1 is the microtexture
uint fetch_texel(uvec4 info, int level, int u, int v, bool translucent) {
    uint flags = info.x;
    bool swap = ((flags >> 10) & 1u) != 0u;
    uint tex_width, tex_height, tex_x, tex_y, sheet;
    if (level == -1) {
        tex_width = 128u;
        tex_height = 128u;
        tex_x = info.z & 0xffffu;
        tex_y = info.z >> 16;
        sheet = swap ? 0u : 1u; // texsheet[1]
        uint sh = 1u << ((flags >> 8) & 3u);
        u <<= sh;
        v <<= sh;
    } else {
        uint texx = info.y & 0xffffu, texy = info.y >> 16;
        tex_width = (32u << ((flags >> 17) & 7u)) >> uint(level);
        tex_height = (32u << ((flags >> 20) & 7u)) >> uint(level);
        tex_x = ((texx - 2048u) >> uint(level)) & 2047u;
        tex_y = ((texy - 1024u) >> uint(level)) & 1023u;
        sheet = ((level & 1) != 0) != swap ? 1u : 0u; // texsheet[level & 1]
        u >>= level;
        v >>= level;
    }
    if (((flags >> 5) & 1u) != 0u && (u & int(tex_width << 8)) != 0) u = ~u;
    if (((flags >> 6) & 1u) != 0u && (v & int(tex_height << 8)) != 0) v = ~v;
    u -= 0x80;
    v -= 0x80;
    uint ufrac = uint(u) & 0xffu;
    uint vfrac = uint(v) & 0xffu;
    int u0 = int(uint(u >> 8) & (tex_width - 1u));
    int u1 = int(uint(u0 + 1) & (tex_width - 1u));
    int v0 = int(uint(v >> 8) & (tex_height - 1u));
    int v1 = int(uint(v0 + 1) & (tex_height - 1u));
    if (((flags >> 3) & 1u) == 0u && u1 == 0) {
        if (ufrac >= 0x80u) { u0 = u1; u1++; ufrac = 0u; }
        else { u1 = u0; u0--; ufrac = 0x100u; }
    }
    if (((flags >> 4) & 1u) == 0u && v1 == 0) {
        if (vfrac >= 0x80u) { v0 = 0; v1++; vfrac = 0u; }
        else { v1 = v0; v0--; vfrac = 0x100u; }
    }
    uint t00 = get_texel(tex_x, tex_y, u0, v0, sheet) << 4;
    uint t01 = get_texel(tex_x, tex_y, u1, v0, sheet) << 4;
    uint t10 = get_texel(tex_x, tex_y, u0, v1, sheet) << 4;
    uint t11 = get_texel(tex_x, tex_y, u1, v1, sheet) << 4;
    if (translucent) {
        if (t00 != 0xf0u) t00 |= 0x00800000u;
        if (t01 != 0xf0u) t01 |= 0x00800000u;
        if (t10 != 0xf0u) t10 |= 0x00800000u;
        if (t11 != 0xf0u) t11 |= 0x00800000u;
        if (t00 == 0xf0u) t00 = t01 & 0xffu;
        if (t01 == 0xf0u) t01 = t00 & 0xffu;
        if (t10 == 0xf0u) t10 = t11 & 0xffu;
        if (t11 == 0xf0u) t11 = t10 & 0xffu;
    }
    uint t0x = lerp8(t00, t01, ufrac);
    uint t1x = lerp8(t10, t11, ufrac);
    if (translucent) {
        if (t0x == 0xf0u) t0x = t1x & 0xffu;
        if (t1x == 0xf0u) t1x = t0x & 0xffu;
    }
    return lerp8(t0x, t1x, vfrac);
}

vec4 shade() {
    uint flags = vInfo.x;
    if (((flags >> 2) & 1u) != 0u) { // checker: the rasterizer draws pixels with (x ^ y) odd
        uvec2 p = uvec2(gl_FragCoord.xy);
        if (((p.x ^ p.y) & 1u) == 0u) discard;
    }
    uint renderer = flags & 3u;
    if (renderer < 2u) return vColor; // solid: its palette colour, from the CPU

    // raster.cpp draw_tex_span, one pixel
    bool translucent = renderer == 3u;
    int max_level = int((flags >> 12) & 31u);
    float z = 1.0 / vOz.x;
    int mml = -int(vMore.x) + fast_log2(z);
    int level = clamp(mml >> 7, 0, max_level);
    int u = to_s32(vOz.y * z * 256.0);
    int v = to_s32(vOz.z * z * 256.0);
    uint t = fetch_texel(vInfo, level, u, v, translucent);
    if (mml > 0 && level < max_level) {
        uint t2 = fetch_texel(vInfo, level + 1, u, v, translucent);
        t = lerp8(t, t2, uint((mml & 127) << 1));
    } else if (((flags >> 7) & 1u) != 0u && mml < 0) {
        uint t2 = fetch_texel(vInfo, -1, u, v, translucent);
        t = lerp8(t, t2, uint(min((-mml) >> int((flags >> 8) & 3u), 127)));
    }
    if (translucent) {
        if (t < 0x00400000u) discard;
        t &= 0xffu;
    }
    uint lumabase = vInfo.w & 0xffffu, pluma = vInfo.w >> 16;
    uint luma = ((lumaWord(lumabase + (t >> 1)) & 0xffu) * pluma / 256u) & 0xffu;
    luma = min(luma, 0x3fu);
    uint c = vMore.y;
    uint cr = ((c >> 0) & 0x1fu) << 8, cg = 0x2000u + (((c >> 5) & 0x1fu) << 8), cb = 0x4000u + (((c >> 10) & 0x1fu) << 8);
    return vec4(float(colorWord(cr + luma)) / 255.0, float(colorWord(cg + luma)) / 255.0, float(colorWord(cb + luma)) / 255.0, 1.0);
}


void main(){outColor=shade();}
