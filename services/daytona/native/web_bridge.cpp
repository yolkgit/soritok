#include "runtime/game_loop.h"
#include "compat/bit_cast.h"
#include "reverse.h"
#include <emscripten/emscripten.h>
#include <fstream>
#include <iterator>
#include <memory>
#include <string>
#include <vector>
#include <cstdio>
#include <deque>

extern bool rom_math_tables;
extern uint64_t rom_math_table_reads;
static std::unique_ptr<rt::GameLoop> game;
static std::string last_error;
static std::vector<float> pcm, fm;
class WebLink final : public rt::LinkTransport {
public:
 bool rx=false,tx=false;
 std::deque<uint8_t> incoming;
 std::vector<uint8_t> outgoing;
 void poll() override {}
 bool rx_open() const override{return rx;}
 bool tx_open() const override{return tx;}
 int read(uint8_t* p,int n) override {int count=std::min(n,int(incoming.size()));for(int i=0;i<count;i++){p[i]=incoming.front();incoming.pop_front();}return count;}
 bool write(const uint8_t* p,int n) override {if(!tx||outgoing.size()+size_t(n)>8*1024*1024)return false;outgoing.insert(outgoing.end(),p,p+n);return true;}
};
static std::unique_ptr<WebLink> web_link;
static std::vector<uint8_t> load(const std::string& p) {
  std::ifstream f(p,std::ios::binary);
  if(!f)throw std::runtime_error("Missing supplied-ROM region: "+p);
  return {std::istreambuf_iterator<char>(f),{}};
}
extern "C" {
EMSCRIPTEN_KEEPALIVE int rom_init(const char* directory, int sound) {
  try {
    game.reset();web_link.reset();webdrive::reverse.reset();
    const std::string d(directory); rt::M2Board::Images img;
    img.program=load(d+"/program.bin"); img.main_data=load(d+"/main_data.bin");
    img.copro_data=load(d+"/copro_data.bin"); img.polygons=load(d+"/polygons.bin");img.textures=load(d+"/textures.bin");
    img.sound_program=load(d+"/sound_program.bin");img.pcm1=load(d+"/pcm1.bin");img.pcm2=load(d+"/pcm2.bin");
    // Reserved memory satisfies the board's size contract. It is never read by
    // mathematical mode and is not presented as recovered table ROM contents.
    img.copro_tables.resize(0x40000); rom_math_tables=true;
    std::ifstream tables(d+"/copro_tables.bin",std::ios::binary);
    if(tables) { tables.read(reinterpret_cast<char*>(img.copro_tables.data()),0x40000);
      if(tables.gcount()!=0x40000)throw std::runtime_error("Invalid supplied TGP table length");
      rom_math_tables=false;
    }
    game=std::make_unique<rt::GameLoop>(std::move(img),sound!=0);
    std::ifstream settings(d+"/ioboard_eeprom.bin",std::ios::binary);
    if(settings){settings.read(reinterpret_cast<char*>(game->board().io().eeprom.data()),128);
      if(settings.gcount()!=128)throw std::runtime_error("Invalid cabinet settings length");}
    last_error.clear();return 1;
  } catch(const std::exception& e) { last_error=e.what();return 0; }
}
EMSCRIPTEN_KEEPALIVE int rom_step(int steer,int accel,int brake,int in0,int in1) {
  try {
    if(!game)throw std::runtime_error("ROM core not initialized");
    rt::Inputs in;in.steer=uint8_t(steer);in.accel=uint8_t(accel);in.brake=uint8_t(brake);in.in0=uint8_t(in0);in.in1=uint8_t(in1);
    if(webdrive::reverse.active){in.accel=32;in.brake=32;}
    game->run_frame(in);
    webdrive::reverse.end();
    if(auto* s=game->sound()){pcm=s->take_pcm();fm=s->take_fm();}
    return 1;
  }catch(const std::exception& e){last_error=e.what();return 0;}
}
EMSCRIPTEN_KEEPALIVE const uint32_t* rom_pixels(){return game?game->screen().data():nullptr;}
EMSCRIPTEN_KEEPALIVE int rom_width(){return game?game->screen_width():496;}
EMSCRIPTEN_KEEPALIVE int rom_height(){return 384;}
EMSCRIPTEN_KEEPALIVE int rom_frames(){return game?int(game->frames()):0;}
EMSCRIPTEN_KEEPALIVE double rom_instructions(){return game?double(game->instructions()):0;}
EMSCRIPTEN_KEEPALIVE double rom_table_reads(){return double(rom_math_table_reads);}
EMSCRIPTEN_KEEPALIVE const char* rom_error(){return last_error.c_str();}
EMSCRIPTEN_KEEPALIVE int rom_math_mode(){return rom_math_tables?1:0;}
EMSCRIPTEN_KEEPALIVE void rom_reverse_input(int requested,int stop,int forward){if(game)webdrive::reverse.begin(game->board(),requested!=0,stop!=0,forward!=0);}
EMSCRIPTEN_KEEPALIVE int rom_reverse_active(){return webdrive::reverse.active;}
#ifdef WEB_DRIVE_DEBUG
EMSCRIPTEN_KEEPALIVE unsigned rom_debug_read(unsigned a){return game->board().read_dword(a);}
#endif
EMSCRIPTEN_KEEPALIVE const uint8_t* rom_eeprom(){return game?game->board().io().eeprom.data():nullptr;}
EMSCRIPTEN_KEEPALIVE void rom_link_enable(){web_link=std::make_unique<WebLink>();game->board().set_link(web_link.get(),false);}
EMSCRIPTEN_KEEPALIVE void rom_link_open(int rx,int tx){if(web_link){web_link->rx=rx!=0;web_link->tx=tx!=0;}}
EMSCRIPTEN_KEEPALIVE int rom_link_receive(const uint8_t* p,int n){if(!web_link||n<0||web_link->incoming.size()+size_t(n)>8*1024*1024)return 0;web_link->incoming.insert(web_link->incoming.end(),p,p+n);return 1;}
EMSCRIPTEN_KEEPALIVE const uint8_t* rom_link_output(){return web_link?web_link->outgoing.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int rom_link_output_size(){return web_link?int(web_link->outgoing.size()):0;}
EMSCRIPTEN_KEEPALIVE void rom_link_drain(){if(web_link)web_link->outgoing.clear();}
EMSCRIPTEN_KEEPALIVE int rom_link_state(){const auto* c=game?game->board().comm_board():nullptr;return c?int(c->link()):0;}
EMSCRIPTEN_KEEPALIVE int rom_link_id(){const auto* c=game?game->board().comm_board():nullptr;return c?c->id():0;}
EMSCRIPTEN_KEEPALIVE int rom_link_count(){const auto* c=game?game->board().comm_board():nullptr;return c?c->count():0;}
EMSCRIPTEN_KEEPALIVE void rom_aspect(double aspect){if(game){game->set_aspect(aspect);game->set_stretch_backdrop(true);game->set_hud_edges(true);}}
EMSCRIPTEN_KEEPALIVE const float* rom_pcm(){return pcm.data();}
EMSCRIPTEN_KEEPALIVE int rom_pcm_count(){return int(pcm.size());}
EMSCRIPTEN_KEEPALIVE const float* rom_fm(){return fm.data();}
EMSCRIPTEN_KEEPALIVE int rom_fm_count(){return int(fm.size());}
}
#include "gpu_bridge.inc"
