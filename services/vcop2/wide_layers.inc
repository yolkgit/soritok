// SPDX-License-Identifier: GPL-3.0-or-later
// Wide tile backgrounds. Scroll/priority/split rules and panorama tracking follow
// sm2-emu (Daniel Martin and contributors), shaders/tilemap_compose.comp.
// Original 496 columns are copied verbatim. Never extend HUD art or change RAM.
struct WideCell { uint32_t tag=0; uint16_t epoch=0, name=0; };
sm2::render::PanoramaTracker wide_tracker;
sm2::render::PanoramaTracker::State wide_state;
std::vector<WideCell> wide_cells(4*128*64);
std::vector<uint32_t> wide_below,wide_above;
uint64_t wide_frame=UINT64_MAX,wide_char_generation=UINT64_MAX;
int wide_built_columns=-1;
uint32_t wide_cached_pixels=0,wide_loop_pixels=0,wide_mirror_pixels=0;

void reset_wide_layers() {
    wide_tracker.reset(); wide_state={}; wide_frame=UINT64_MAX; wide_char_generation=UINT64_MAX;
    wide_built_columns=-1; std::fill(wide_cells.begin(),wide_cells.end(),WideCell{});
}
uint32_t wide_word(uint32_t index) {
    const auto ram=machine->video().tile_ram_shown();const size_t p=size_t(index)*2;
    return p+1<ram.size()?uint32_t(ram[p])|(uint32_t(ram[p+1])<<8):0;
}
struct WideSource { uint32_t layer,x,y; bool visible; };
WideSource wide_source(uint32_t layer,int dx,int dy,int mask_x) {
    const uint32_t v=wide_word(0x5004+layer),even=layer&~1u;
    if(v&0x8000)return {layer,0,0,false};
    const uint32_t ctrl=wide_word(0x5004+even),mode=(ctrl>>13)&3;
    uint32_t h=wide_word(0x5000+(mode?even:layer)),chosen=layer;
    if(mode){
        if(layer&1)return {layer,0,0,false};
        if(h&0x8000)h=wide_word(0x4000+0x200*even+dy);
        if(mode==1){const uint32_t nv=0u-ctrl,boundary=nv&511;
            chosen=((nv&512)?even:even^1u)^(dy>=int(boundary)?1u:0u);
        }else{const uint32_t boundary=h&511,left=(h&512)?even:even^1u;
            chosen=dx<int(boundary)?left:left^1u;
        }
        return {chosen,(0u-h+uint32_t(dx))&511,(ctrl+uint32_t(dy))&511,true};
    }
    if(!(layer<2&&machine->video().window_mask_a_hidden())){
        const uint32_t mask=wide_word((layer&2?0x6800:0x6000)+dy*4+(mask_x>>7));
        const bool bit=(mask>>(15-((mask_x&127)>>3)))&1;
        if(bit!=bool(layer&1))return {layer,0,0,false};
    }
    if(h&0x8000)h=wide_word(0x4000+0x200*layer+dy);
    return {chosen,(0u-h+uint32_t(dx))&511,(v+uint32_t(dy))&511,true};
}
uint16_t wide_name(const WideSource& s) {return uint16_t(wide_word(s.layer*0x1000+(s.y>>3)*64+(s.x>>3)));}
struct WideAddress { size_t slot;uint32_t tag; };
WideAddress wide_address(uint32_t layer,int dx,int dy) {
    const uint32_t h=(0u-wide_word(0x5000+layer))&511,v=wide_word(0x5004+layer)&511;
    const uint32_t bx=(h-wide_state.offset[layer])&7,by=(v-wide_state.offset_y[layer])&7;
    const uint32_t wx=((wide_state.offset[layer]+uint32_t(dx)+bx)&65535)>>3;
    const uint32_t wy=((wide_state.offset_y[layer]+uint32_t(dy)+by)&65535)>>3;
    return {(layer*128+(wx&127))*64+(wy&63),wx|(wy<<13)};
}
void record_wide_cells() {
    for(uint32_t layer=0;layer<4;layer++){
        if(!(wide_state.cacheable&(1u<<layer)))continue;
        const int h=int((0u-wide_word(0x5000+layer))&511),v=int(wide_word(0x5004+layer)&511);
        for(int cy=-(v&7);cy<384;cy+=8)for(int cx=-(h&7);cx<496;cx+=8){
            const int x=std::max(0,cx),y=std::max(0,cy);
            // Cache each layer independently, including currently masked cells:
            // its original name table still holds the visible raster's data.
            auto s=wide_source(layer,x,y,x);if(!s.visible){
                const uint32_t mode=(wide_word(0x5004+(layer&~1u))>>13)&3;
                if(mode)continue;s={layer,uint32_t(h+x)&511,uint32_t(v+y)&511,true};
            }
            const auto a=wide_address(layer,x,y);
            wide_cells[a.slot]={a.tag,uint16_t(wide_state.epoch[layer]),wide_name(s)};
        }
    }
}
bool wide_colour(uint16_t name,uint32_t sx,uint32_t sy,bool opaque,uint32_t& colour) {
    // Foreground-category names are menus/HUD and never copied into the sides.
    if(name&0x8000)return false;
    const auto chars=machine->char_ram();
    const size_t index=(name&0x3fff)*32+(((sy&7)*4+((sx&7)>>1))^1);
    if(index>=chars.size())return false;
    const uint32_t nibble=(sx&1)?chars[index]&15:chars[index]>>4;
    if(!opaque&&!nibble)return false;
    const auto pens=machine->video().pens();
    colour=pens[((name>>7)&255)*16+nibble];return true;
}
uint32_t wide_side(int sx,int y) {
    const int mirror=sx<0?-1-sx:991-sx;
    for(uint32_t layer=0;layer<4;layer++){
        const auto source=wide_source(layer,sx,y,mirror);if(!source.visible)continue;
        uint32_t colour;bool known=false;
        if(wide_state.cacheable&(1u<<layer)){
            if((wide_state.wrap_rows[layer]>>(source.y>>3))&1){
                if(wide_colour(wide_name(source),source.x,source.y,layer>=2,colour)){wide_loop_pixels++;return colour;}
                known=true;
            }else{const auto a=wide_address(layer,sx,y);const auto& cell=wide_cells[a.slot];
                if(cell.epoch==wide_state.epoch[layer]&&cell.tag==a.tag){
                    if(wide_colour(cell.name,source.x,source.y,layer>=2,colour)){wide_cached_pixels++;return colour;}
                    known=true;
                }
            }
        }
        if(!known){const auto edge=wide_source(layer,mirror,y,mirror);
            if(edge.visible&&wide_colour(wide_name(edge),edge.x,edge.y,layer>=2,colour)){wide_mirror_pixels++;return colour;}
        }
    }
    return machine->video().background();
}
uint32_t wide_bar(bool left,int y) {
    const auto front=machine->video().above();const int x=left?0:495;
    const uint32_t colour=front[y*496+x];if(!(colour>>24))return 0;
    int rows=0;
    for(int dy=-2;dy<=2;dy++)if(y+dy>=0&&y+dy<384){
        bool same=true;for(int d=0;d<=6;d+=2)if(front[(y+dy)*496+x+(left?d:-d)]!=colour)same=false;
        if(!same&&dy==0)return 0;if(same&&dy)rows++;
    }
    return rows>=2?colour:0;
}
void update_wide_layers() {
    if(!machine||!gpu_mode||wide_columns<=0)return;
    const auto generation=machine->char_generation();
    if(generation!=wide_char_generation){reset_wide_layers();wide_char_generation=generation;}
    const auto frame=machine->frames();
    if(wide_frame==frame&&wide_built_columns==wide_columns)return;
    if(wide_frame!=frame){
        wide_state=wide_tracker.update(machine->video().tile_ram_shown());record_wide_cells();wide_frame=frame;
    }
    wide_built_columns=wide_columns;
    const int width=496+2*wide_columns;wide_below.resize(width*384);wide_above.resize(width*384);
    wide_cached_pixels=wide_loop_pixels=wide_mirror_pixels=0;
    const auto below=machine->video().below(),above=machine->video().above();
    for(int y=0;y<384;y++){
        const int row=y*width;
        std::copy_n(below.data()+y*496,496,wide_below.data()+row+wide_columns);
        std::copy_n(above.data()+y*496,496,wide_above.data()+row+wide_columns);
        const uint32_t left=wide_bar(true,y),right=wide_bar(false,y);
        for(int x=0;x<wide_columns;x++){
            wide_below[row+x]=wide_side(x-wide_columns,y);wide_above[row+x]=left;
            wide_below[row+width-wide_columns+x]=wide_side(496+x,y);wide_above[row+width-wide_columns+x]=right;
        }
    }
}
