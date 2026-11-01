// SPDX-License-Identifier: GPL-3.0-or-later AND BSD-3-Clause
// Exports the original sm2-emu display list. Packing/texture-state conventions
// also follow daytona-arcade-recomp (Ben Templeman and contributors, BSD-3-Clause).
// See web/renderer-license.txt. No game instructions or RAM are changed here.
#include <cstring>
#include <limits>

namespace {
struct WebVertex { float x,y,depth, polygon,count,unused, r,g,b,a; uint32_t info[4],more[2]; };
static_assert(sizeof(WebVertex) == 64);
struct WebBatch { uint32_t first,count; int32_t x,y,w,h; };
std::vector<WebVertex> gpu_vertices;
std::vector<WebBatch> gpu_batches;
// Each vertex occupies two RGBA texels. 16 polygons per 256-texel row.
std::vector<float> gpu_rings;
std::vector<uint32_t> gpu_texture(0x80000), gpu_luma(0x8000), gpu_xlat(0x6000);
uint64_t gpu_texture_generation = UINT64_MAX, gpu_table_generation = UINT64_MAX;
double gpu_build_ms = 0;
uint32_t gamma_component(uint32_t value) { return value <= 40 ? 0 : (value - 40) * 255 / 215; }
uint32_t palette(size_t index) { const auto p = machine->palette_ram(); return index < p.size() ? p[index] : 0; }

void build_gpu() {
    const auto start = Clock::now();
    gpu_vertices.clear(); gpu_batches.clear(); gpu_rings.clear();
    const auto &polygons = machine->render_list().polygons;
    gpu_rings.resize(((polygons.size() + 15) / 16) * 16 * 64, 0.0f);
    const float depth_step = 1.0f / float(polygons.size() + 2);
    size_t index = 0;
    for (const auto &poly : polygons) {
        const size_t id = index++;
        const uint32_t render = (poly.texheader[0] >> 13) & 3;
        if (poly.num_vertices < 3 || render == 1) continue;
        const int x0 = std::max(0, int(poly.scissor[0])), y0 = std::max(0, int(poly.scissor[1]));
        const int x1 = std::min(495 + 2 * wide_columns, int(poly.scissor[2]));
        const int y1 = std::min(383, int(poly.scissor[3]));
        if (x1 < x0 || y1 < y0) continue;
        const uint32_t color = palette(((poly.texheader[3] >> 6) & 0x3ff) + 0x1000);
        const uint32_t shade = poly.luma >> 2;
        const float r = gpu_xlat[(((color >> 0) & 31) << 8) + shade] / 255.0f;
        const float g = gpu_xlat[0x2000 + (((color >> 5) & 31) << 8) + shade] / 255.0f;
        const float b = gpu_xlat[0x4000 + (((color >> 10) & 31) << 8) + shade] / 255.0f;
        const uint32_t th0 = poly.texheader[0], th1 = poly.texheader[1], th2 = poly.texheader[2];
        const uint32_t mx = (th0 >> 8) & 1, my = (th0 >> 9) & 1;
        const uint32_t wl = th0 & 7, hl = (th0 >> 3) & 7;
        const uint32_t flags = render | ((th0 >> 15) & 1) << 2 | (((th0 >> 6) & 1) & ~mx) << 3 |
            (((th0 >> 7) & 1) & ~my) << 4 | mx << 5 | my << 6 | ((th0 >> 12) & 1) << 7 |
            ((th0 >> 10) & 3) << 8 | ((th2 >> 12) & 1) << 10 | (4 + std::min(wl, hl)) << 12 | wl << 17 | hl << 20;
        const uint32_t info[4] = {flags, (32u * (th2 & 63)) | (32u * ((th2 >> 6) & 31)) << 16,
            (((th2 >> 13) & 1) * 128) | (((th2 >> 14) & 3) * 128) << 16,
            ((th1 & 255) << 7) | uint32_t(poly.luma) << 16};
        WebVertex vertices[8];
        for (int k = 0; k < poly.num_vertices; ++k) {
            const auto &v = poly.v[k];
            const float q = 1.0f / (v.p[0] + std::numeric_limits<float>::min());
            const size_t slot = id * 64 + k * 8;
            gpu_rings[slot] = v.x; gpu_rings[slot+1] = v.y; gpu_rings[slot+2] = q;
            gpu_rings[slot+3] = v.p[1] * q / 8.0f; gpu_rings[slot+4] = v.p[2] * q / 8.0f;
            vertices[k] = {v.x,v.y,float(id+1)*depth_step,float(id),float(poly.num_vertices),0,
                r,g,b,1,{info[0],info[1],info[2],info[3]}, {uint32_t(poly.texlod),color&0x7fff}};
        }
        if (gpu_batches.empty() || gpu_batches.back().x != x0 || gpu_batches.back().y != y0 ||
            gpu_batches.back().w != x1-x0+1 || gpu_batches.back().h != y1-y0+1)
            gpu_batches.push_back({uint32_t(gpu_vertices.size()),0,x0,y0,x1-x0+1,y1-y0+1});
        for (int k=1;k+1<poly.num_vertices;++k) {
            gpu_vertices.push_back(vertices[0]); gpu_vertices.push_back(vertices[k]); gpu_vertices.push_back(vertices[k+1]);
        }
        gpu_batches.back().count = uint32_t(gpu_vertices.size()) - gpu_batches.back().first;
    }
    gpu_build_ms = milliseconds(start);
}
void update_tables() {
    const auto table_generation = machine->table_generation();
    if (table_generation != gpu_table_generation) {
        const auto xlat = machine->colour_translate(); const auto luma = machine->luma_ram();
        for (size_t i=0;i<gpu_xlat.size();++i) gpu_xlat[i] = gamma_component(i<xlat.size() ? xlat[i]&255 : 0);
        for (size_t i=0;i<gpu_luma.size();++i) gpu_luma[i] = i<luma.size() ? luma[i] : 0;
        gpu_table_generation = table_generation;
    }
    const auto texture_generation = machine->texture_generation();
    if (texture_generation != gpu_texture_generation) {
        for (int sheet=0;sheet<2;++sheet) {
            const auto source = machine->texture_ram(sheet);
            std::copy_n(source.data(),std::min<size_t>(source.size(),0x40000),gpu_texture.data()+sheet*0x40000);
        }
        gpu_texture_generation = texture_generation;
    }
}
}
extern "C" {
EMSCRIPTEN_KEEPALIVE void rom_gpu_mode(int enable) { gpu_mode = enable != 0; gpu_texture_generation = gpu_table_generation = UINT64_MAX; }
EMSCRIPTEN_KEEPALIVE void rom_wide_columns(int columns) { wide_columns=std::clamp(columns,0,128); if(machine)machine->set_widescreen(wide_columns); }
EMSCRIPTEN_KEEPALIVE void rom_gpu_build() { if(machine) { update_tables(); build_gpu(); } }
EMSCRIPTEN_KEEPALIVE const WebVertex* rom_gpu_vertices() { return gpu_vertices.data(); }
EMSCRIPTEN_KEEPALIVE int rom_gpu_vertex_count() { return int(gpu_vertices.size()); }
EMSCRIPTEN_KEEPALIVE const WebBatch* rom_gpu_batches() { return gpu_batches.data(); }
EMSCRIPTEN_KEEPALIVE int rom_gpu_batch_count() { return int(gpu_batches.size()); }
EMSCRIPTEN_KEEPALIVE const float* rom_gpu_rings() { return gpu_rings.data(); }
EMSCRIPTEN_KEEPALIVE int rom_gpu_ring_floats() { return int(gpu_rings.size()); }
EMSCRIPTEN_KEEPALIVE const uint32_t* rom_gpu_layer(int front) { if(!machine)return nullptr; return front ? machine->video().above().data() : machine->video().below().data(); }
EMSCRIPTEN_KEEPALIVE uint32_t rom_gpu_background() { return machine ? machine->video().background() : 0xff000000; }
EMSCRIPTEN_KEEPALIVE const uint32_t* rom_gpu_texture() { return gpu_texture.data(); }
EMSCRIPTEN_KEEPALIVE const uint32_t* rom_gpu_xlat() { return gpu_xlat.data(); }
EMSCRIPTEN_KEEPALIVE const uint32_t* rom_gpu_luma() { return gpu_luma.data(); }
EMSCRIPTEN_KEEPALIVE double rom_gpu_texture_generation() { return double(gpu_texture_generation); }
EMSCRIPTEN_KEEPALIVE double rom_gpu_table_generation() { return double(gpu_table_generation); }
EMSCRIPTEN_KEEPALIVE double rom_gpu_build_ms() { return gpu_build_ms; }
}
