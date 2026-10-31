// SPDX-License-Identifier: GPL-3.0-or-later
// Browser bridge for the original user-provided Virtua Cop 2 ROM.
// Uses sm2-emu's Model 2A machine/display list and a software fallback.
// Upstream copyright and additional terms are retained in vendor/sm2-emu.
#include "hw/model2.h"
#include "hw/model2_softrender.h"
#include "core/log.h"
#include <emscripten/emscripten.h>
#include <algorithm>
#include <chrono>
#include <cmath>
#include <fstream>
#include <iterator>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
std::unique_ptr<sm2::hw::Model2> machine;
std::unique_ptr<sm2::hw::SoftRenderer> renderer;
std::vector<sm2::u32> pixels(496 * 384, 0xff000000u);
std::vector<float> pcm;
std::string error;
bool gpu_mode = false;
int wide_columns = 0;
double cpu_ms = 0, tile_ms = 0, raster_ms = 0;
using Clock = std::chrono::steady_clock;
double milliseconds(Clock::time_point start) { return std::chrono::duration<double, std::milli>(Clock::now() - start).count(); }

std::vector<sm2::u8> load(const std::string& directory, const char* name, size_t expected) {
    const auto path = directory + "/" + name + ".bin";
    std::ifstream file(path, std::ios::binary);
    if (!file) throw std::runtime_error("Missing supplied-ROM region: " + path);
    std::vector<sm2::u8> data{std::istreambuf_iterator<char>(file), {}};
    if (data.size() != expected) throw std::runtime_error("Wrong region size: " + path);
    return data;
}

sm2::rom::GameSpec specification() {
    // Exact title metadata and gun calibration from the pinned upstream
    // data/games.xml vcop2 entry, not synthesized replacement game rules.
    sm2::rom::GameSpec spec;
    spec.name = "vcop2";
    spec.title = "Virtua Cop 2";
    spec.manufacturer = "Sega";
    spec.year = 1995;
    spec.board = sm2::rom::Board::Model2A;
    spec.inputs = sm2::rom::InputFlags::Common | sm2::rom::InputFlags::Gun1 | sm2::rom::InputFlags::Gun2;
    spec.lightgun.present = true;
    spec.lightgun.p1x = {0x089, 0x276, 0x17f};
    spec.lightgun.p1y = {0x024, 0x1a9, 0x0e6};
    spec.lightgun.p2x = {0x086, 0x273, 0x17c};
    spec.lightgun.p2y = {0x024, 0x1a9, 0x0e6};
    return spec;
}

sm2::u16 coordinate(int pixel, int extent, int minimum, int maximum) {
    // Match upstream fraction_to_gun: visible pixels are one step inside
    // calibrated endpoints; only the dedicated reload input goes off screen.
    return static_cast<sm2::u16>(minimum + 1 + (std::clamp(pixel, 0, extent - 1) * (maximum - minimum - 2) + (extent - 1) / 2) / (extent - 1));
}

void compose() {
    auto start = Clock::now();
    machine->compose_video();
    tile_ms = milliseconds(start);
    start = Clock::now();
    if (!gpu_mode) renderer->render(*machine, machine->render_list(), pixels);
    raster_ms = milliseconds(start);
}
}

extern "C" {
EMSCRIPTEN_KEEPALIVE int rom_init(const char* directory) {
    try {
        renderer.reset();
        machine.reset();
        pcm.clear();
        gpu_mode = false; wide_columns = 0;
        error.clear();
        sm2::log::set_level(sm2::log::Level::Warning);
        const std::string d = directory ? directory : "/roms";
        sm2::rom::RomSet roms;
        const struct { const char* name; size_t size; } regions[] = {
            {"maincpu", 0x200000}, {"main_data", 0x2400000},
            {"copro_data", 0x800000}, {"polygons", 0x2000000},
            {"textures", 0x400000}, {"copro_tgp_tables", 0x40000},
            {"audiocpu", 0x80000}, {"samples", 0x800000}
        };
        for (const auto& region : regions) roms.add(region.name, load(d, region.name, region.size));
        machine = std::make_unique<sm2::hw::Model2>();
        if (!machine->init(specification(), std::move(roms))) throw std::runtime_error("Model 2A initialization failed");
        renderer = std::make_unique<sm2::hw::SoftRenderer>();
        // A single band needs no SharedArrayBuffer or cross-origin isolation.
        renderer->set_bands(1);
        compose();
        return 1;
    } catch (const std::exception& e) { error = e.what(); return 0; }
}

// bits: trigger=1, off-screen reload=2, coin=4, start=8, service=16, test=32.
// Gun input is the original serial board's calibrated 10-bit coordinate.
EMSCRIPTEN_KEEPALIVE int rom_step(int x, int y, int buttons) {
    try {
        if (!machine || !renderer) throw std::runtime_error("ROM core is not initialized");
        auto& input = machine->inputs();
        input.in0 = 0xff;
        input.in1 = 0xff;
        input.in2 = 0xff;
        if (buttons & 4) input.in0 &= ~0x01;
        if (buttons & 8) input.in0 &= ~0x10;
        if (buttons & 16) input.in0 &= ~0x08;
        if (buttons & 32) input.in0 &= ~0x04;
        if (buttons & 3) input.in1 &= ~0x01;
        const auto axis = sm2::rom::widened_axis(sm2::rom::LightgunAxis{0x089, 0x276, 0x17f}, wide_columns, 496);
        input.gun_p1x = (buttons & 2) ? axis.minimum : coordinate(x, 496 + 2 * wide_columns, axis.minimum, axis.maximum);
        input.gun_p1y = (buttons & 2) ? 0x024 : coordinate(y, 384, 0x024, 0x1a9);
        const auto start = Clock::now();
        machine->run_frame();
        cpu_ms = milliseconds(start);
        if (machine->cpu().faulted()) throw std::runtime_error(machine->cpu().fault_message());
        const auto pending = machine->sound().pending_samples();
        pcm.resize(pending.size());
        std::transform(pending.begin(), pending.end(), pcm.begin(), [](sm2::s16 value) { return static_cast<float>(value) / 32768.0f; });
        machine->sound().clear_pending_samples();
        compose();
        return 1;
    } catch (const std::exception& e) { error = e.what(); return 0; }
}

EMSCRIPTEN_KEEPALIVE void rom_nvram_load() {
    if (machine) { machine->set_nvram_directory("/nvram"); machine->load_nvram(); }
}
EMSCRIPTEN_KEEPALIVE void rom_nvram_save() {
    if (machine) { machine->set_nvram_directory("/nvram"); machine->save_nvram(); }
}
EMSCRIPTEN_KEEPALIVE int rom_reset() {
    try {
        if (!machine) throw std::runtime_error("ROM core is not initialized");
        machine->reset(); pcm.clear(); error.clear(); compose(); return 1;
    } catch (const std::exception& e) { error = e.what(); return 0; }
}
EMSCRIPTEN_KEEPALIVE const sm2::u32* rom_pixels() { return pixels.data(); }
EMSCRIPTEN_KEEPALIVE int rom_width() { return 496 + 2 * wide_columns; }
EMSCRIPTEN_KEEPALIVE int rom_height() { return 384; }
EMSCRIPTEN_KEEPALIVE const float* rom_pcm() { return pcm.data(); }
EMSCRIPTEN_KEEPALIVE int rom_pcm_count() { return static_cast<int>(pcm.size()); }
EMSCRIPTEN_KEEPALIVE int rom_sample_rate() { return 44100; }
EMSCRIPTEN_KEEPALIVE double rom_frames() { return machine ? static_cast<double>(machine->frames()) : 0; }
EMSCRIPTEN_KEEPALIVE double rom_instructions() { return machine ? static_cast<double>(machine->cpu().instructions()) : 0; }
EMSCRIPTEN_KEEPALIVE int rom_polygons() { return machine ? static_cast<int>(machine->render_list().polygons.size()) : 0; }
EMSCRIPTEN_KEEPALIVE const char* rom_error() { return error.c_str(); }
EMSCRIPTEN_KEEPALIVE double rom_cpu_ms() { return cpu_ms; }
EMSCRIPTEN_KEEPALIVE double rom_tile_ms() { return tile_ms; }
EMSCRIPTEN_KEEPALIVE double rom_raster_ms() { return raster_ms; }
EMSCRIPTEN_KEEPALIVE int rom_peek(unsigned address) {
    // Inspection must not perform a hardware access or charge bus wait cycles.
    if (!machine || address < 0x00500000 || address >= 0x00600000) return 0;
    return machine->work_ram()[address - 0x00500000];
}
}
#include "gpu_bridge.inc"
