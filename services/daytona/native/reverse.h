// Keyboard back-out extension for the supplied Revision A. No game code/data.
#pragma once
#include "runtime/gen_support.h"
#include "runtime/m2_board.h"
#include <algorithm>
#include <cmath>

namespace webdrive {
struct Reverse {
    unsigned car=0, dwell=0;
    bool active=false;
    float velocity=0;
    void reset(){car=0;dwell=0;active=false;velocity=0;}
    void begin(rt::M2Board &board, bool requested, bool stop, bool forward){
        // 0x501220 is the local physics object. 0x54004c is a transient view
        // pointer and points at a communication snapshot in linked cabinets.
        const auto own=board.read_dword(0x501220);
        // Play flag excludes attract mode, selections, rolling start and results.
        if(!(board.read_dword(0x501090)&0x400000) || own<0x500000 || own>0x5ff000 || (own&3)) {reset();return;}
        if(car!=own){reset();car=own;}
        const float speed=gen::u2f(board.read_dword(car+0x34));
        if(!std::isfinite(speed)){reset();return;}
        if(!active){
            if(requested&&!stop&&!forward&&std::abs(speed)<.008f){
                if(++dwell>=20){active=true;velocity=0;}
            }else dwell=0;
        }
        if(!active)return;
        // A collision or recovery can give the car forward momentum. Respect it.
        if(speed>.015f){reset();return;}
        velocity=std::clamp(speed,-.05f,0.f);
        if(requested&&!stop&&!forward)velocity=std::max(-.05f,velocity-.0008f);
        else velocity=std::min(0.f,velocity+(stop?.005f:.003f));
        // Keep the override for this last zero-speed frame; end() releases it.
    }
    void end(){if(active&&velocity==0){active=false;dwell=0;}}
};
extern Reverse reverse;
}
// Generated instructions call these only at three audited write sites.
void web_reverse_speed(rt::Cpu &cpu, unsigned address, unsigned value);
void web_reverse_display(rt::Cpu &cpu, unsigned address, unsigned value);
