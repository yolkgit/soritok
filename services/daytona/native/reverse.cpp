#include "runtime/m2_board.h"
#include "reverse.h"
namespace webdrive { Reverse reverse; }
void web_reverse_speed(rt::Cpu &cpu,unsigned address,unsigned value){
    const auto &r=webdrive::reverse;
    if(r.active&&address==r.car+0x34)value=gen::f2u(r.velocity);
    cpu.i960_write_dword_unaligned(address,value);
}
void web_reverse_display(rt::Cpu &cpu,unsigned address,unsigned value){
    const auto &r=webdrive::reverse;
    if(r.active&&address==r.car+0x18&&int32_t(value)<0){
        value=uint32_t(-int32_t(value));
        cpu.m_r[16]=value; // subsequent RPM/display arithmetic also uses magnitude
    }
    cpu.i960_write_dword_unaligned(address,value);
}
