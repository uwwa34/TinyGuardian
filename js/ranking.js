// ═══════════════════════════════════════════════════
//  js/ranking.js — Tiny Guardian (layout matching original)
// ═══════════════════════════════════════════════════

function _rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// ─────────────────────────────────────────────────
class TallyScreen {
  constructor(){this.lines=[];this.total=0;this.animIndex=0;this.animTimer=0;this.done=false;this._t=0;}
  init(player,stagesCleared,timeBonuses){
    this.lines=[];this.animIndex=0;this.animTimer=0;this.done=false;this._t=0;
    let stageBonus=stagesCleared*STAGE_CLEAR_BONUS, timeBonus=0;
    for(const tb of timeBonuses) timeBonus+=tb;
    let enemyScore=player.score-stageBonus-timeBonus-(player.itemsCollected*50);
    if(enemyScore<0) enemyScore=0;
    this.lines=[
      {icon:'👾',label:'ศัตรูกำจัด',  val:player.kills+' ตัว'},
      {icon:'⚔️',label:'คะแนนต่อสู้', val:enemyScore.toLocaleString()+' pts'},
      {icon:'⭐',label:'ไอเทมเก็บ',   val:player.itemsCollected+' ชิ้น'},
      {icon:'🏁',label:'ผ่านด่าน',    val:stagesCleared+' ด่าน (+'+stageBonus+')'},
      {icon:'⏱',label:'Time Bonus',  val:'+'+timeBonus},
    ];
    this.total=player.score;
  }
  update(dt){this._t++;if(this.done)return;this.animTimer+=dt;if(this.animTimer>0.35){this.animTimer=0;this.animIndex++;if(this.animIndex>=this.lines.length)this.done=true;}}
  draw(ctx){
    // BG
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,'#FFF8E1');g.addColorStop(1,'#FFE082');
    ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
    // Decorative
    ['☀️','🌟','⭐','✨'].forEach((e,i)=>{
      const px=[30,WIDTH-36,60,WIDTH-60][i],py=[50,50,HEIGHT-60,HEIGHT-60][i];
      ctx.font='22px serif';ctx.textBaseline='middle';ctx.textAlign='center';
      ctx.globalAlpha=0.5+Math.sin(Date.now()/600+i)*0.3;ctx.fillText(e,px,py);
    });ctx.globalAlpha=1;
    // Panel
    ctx.fillStyle='rgba(255,248,225,0.92)';ctx.strokeStyle=COL.PRIMARY;ctx.lineWidth=2;
    _rr(ctx,20,60,WIDTH-40,HEIGHT-140,20);ctx.fill();ctx.stroke();
    // Title
    ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 22px '+FONT.MAIN;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🎉 ผลการผจญภัย!',WIDTH/2,100);
    // Rows
    let ry=138;const rowH=36;
    ctx.font='15px '+FONT.BODY;ctx.textBaseline='middle';
    for(let i=0;i<Math.min(this.animIndex+1,this.lines.length);i++){
      const l=this.lines[i];
      const reveal=Math.min(1,(this._t-i*8)/20);ctx.globalAlpha=Math.max(0,reveal);
      ctx.fillStyle='rgba(255,236,179,0.5)';_rr(ctx,32,ry-14,WIDTH-64,rowH-4,6);ctx.fill();
      ctx.font='18px serif';ctx.textAlign='left';ctx.fillStyle=COL.PRIMARY_D;ctx.fillText(l.icon,42,ry+4);
      ctx.font='15px '+FONT.BODY;ctx.fillText(l.label,68,ry+4);
      ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 15px '+FONT.BODY;ctx.textAlign='right';ctx.fillText(l.val,WIDTH-46,ry+4);
      ctx.font='15px '+FONT.BODY;ry+=rowH;
    }
    ctx.globalAlpha=1;
    // Divider
    ry+=4;ctx.strokeStyle=COL.PRIMARY_D;ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(32,ry);ctx.lineTo(WIDTH-32,ry);ctx.stroke();ctx.setLineDash([]);ry+=14;
    // Total box
    ctx.fillStyle=COL.PRIMARY;_rr(ctx,28,ry,WIDTH-56,48,10);ctx.fill();
    ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 20px '+FONT.MAIN;ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('รวมทั้งหมด',44,ry+24);ctx.textAlign='right';
    ctx.fillText('⭐ '+this.total.toLocaleString(),WIDTH-44,ry+24);
    ry+=60;
    // Next button
    if(this.done){
      const alpha=Math.min(1,(this._t-this.lines.length*8)/20);ctx.globalAlpha=alpha;
      ctx.fillStyle=COL.PRIMARY;_rr(ctx,WIDTH/2-110,ry,220,46,14);ctx.fill();
      ctx.strokeStyle=COL.PRIMARY_D;ctx.lineWidth=2;_rr(ctx,WIDTH/2-110,ry,220,46,14);ctx.stroke();
      ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 16px '+FONT.MAIN;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('✏️ ใส่ชื่อ →',WIDTH/2,ry+23);ctx.globalAlpha=1;
    }
  }
}

// ─────────────────────────────────────────────────
class NameScreen {
  constructor(){this.name='';this.maxLen=10;this.cursor=true;this.cursorT=0;this._kbData=null;}
  reset(){this.name='';this.cursor=true;this.cursorT=0;}
  handleKey(key){
    if(key==='Backspace'){this.name=this.name.slice(0,-1);}
    else if((key==='Enter')&&this.name.length>=1) return this.name;
    else if(this.name.length<this.maxLen&&key.length===1&&/[a-zA-Z0-9ก-๛]/.test(key)) this.name+=key.toUpperCase();
    return null;
  }
  update(dt){this.cursorT++;if(this.cursorT%28===0) this.cursor=!this.cursor;}
  draw(ctx){
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,'#FFF8E1');g.addColorStop(1,'#FFE082');
    ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
    // Decor
    ['🌟','✨','⭐','🌟'].forEach((e,i)=>{
      const px=[22,WIDTH-28,48,WIDTH-52][i],py=[44,44,HEIGHT-50,HEIGHT-50][i];
      ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.globalAlpha=0.4+Math.sin(Date.now()/700+i)*0.3;ctx.fillText(e,px,py);
    });ctx.globalAlpha=1;
    // Panel
    ctx.fillStyle='rgba(255,248,225,0.92)';ctx.strokeStyle=COL.PRIMARY;ctx.lineWidth=2;
    _rr(ctx,16,52,WIDTH-32,250,18);ctx.fill();ctx.stroke();
    // Title
    ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 22px '+FONT.MAIN;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('✏️ ใส่ชื่อผู้เล่น',WIDTH/2,85);
    ctx.fillStyle=COL.PRIMARY_D;ctx.font='14px '+FONT.BODY;
    ctx.fillText('คะแนน: ⭐ --',WIDTH/2,112);
    // Name input box
    const bx=WIDTH/2-150,by=140;
    ctx.fillStyle='#FFF';ctx.strokeStyle=COL.PRIMARY;ctx.lineWidth=2;
    _rr(ctx,bx,by,300,50,10);ctx.fill();ctx.stroke();
    ctx.fillStyle=this.name?COL.HUD_TEXT:'#9E9E9E';
    ctx.font='bold 22px "Courier New",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText((this.name||'PLAYER')+(this.cursor?'|':' '),WIDTH/2,by+25);
    // VKB — full-width keys like original
    this._drawVKB(ctx,310);
    // Confirm button
    ctx.fillStyle=COL.PRIMARY;_rr(ctx,WIDTH/2-105,460,210,46,14);ctx.fill();
    ctx.strokeStyle=COL.PRIMARY_D;ctx.lineWidth=2;_rr(ctx,WIDTH/2-105,460,210,46,14);ctx.stroke();
    ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 17px '+FONT.MAIN;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('✅ ยืนยัน',WIDTH/2,483);
  }
  _drawVKB(ctx,startY){
    const rows=[
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      ['Z','X','C','V','B','N','M','⌫'],
    ];
    const keyH=42,keyGap=3;
    this._kbData={rows,startY,keyH,keyGap};
    rows.forEach((row,ri)=>{
      const keyW=Math.floor((WIDTH-20)/row.length)-keyGap;
      const rowX=(WIDTH-(keyW+keyGap)*row.length)/2;
      row.forEach((k,ki)=>{
        const kx=rowX+ki*(keyW+keyGap), ky=startY+ri*(keyH+keyGap);
        const isDel=k==='⌫';
        ctx.fillStyle=isDel?'rgba(239,154,154,0.3)':'rgba(255,236,179,0.7)';
        ctx.strokeStyle=isDel?COL.HEART_ON:COL.PRIMARY;ctx.lineWidth=1;
        _rr(ctx,kx,ky,keyW,keyH,5);ctx.fill();ctx.stroke();
        ctx.fillStyle=isDel?COL.HEART_ON:COL.HUD_TEXT;
        ctx.font=(isDel?13:12)+'px '+FONT.BODY;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(k,kx+keyW/2,ky+keyH/2);
      });
    });
  }
  handleTouch(tx,ty){
    if(!this._kbData) return null;
    const{rows,startY,keyH,keyGap}=this._kbData;
    for(let ri=0;ri<rows.length;ri++){
      const row=rows[ri];
      const keyW=Math.floor((WIDTH-20)/row.length)-keyGap;
      const rowX=(WIDTH-(keyW+keyGap)*row.length)/2;
      for(let ki=0;ki<row.length;ki++){
        const kx=rowX+ki*(keyW+keyGap),ky=startY+ri*(keyH+keyGap);
        if(tx>=kx&&tx<=kx+keyW&&ty>=ky&&ty<=ky+keyH){
          const k=row[ki];
          if(k==='⌫') return this.handleKey('Backspace');
          return this.handleKey(k);
        }
      }
    }
    // Confirm button
    if(tx>=WIDTH/2-105&&tx<=WIDTH/2+105&&ty>=460&&ty<=506) return this.handleKey('Enter');
    return null;
  }
}

// ─────────────────────────────────────────────────
class RankingScreen {
  constructor(){this.entries=[];this.highlightIndex=-1;this._t=0;this.playerScore=0;}
  load(){try{const r=localStorage.getItem(RANKING_KEY);this.entries=r?JSON.parse(r):[];}catch(e){this.entries=[];}}
  save(){try{localStorage.setItem(RANKING_KEY,JSON.stringify(this.entries.slice(0,RANKING_MAX)));}catch(e){}}
  addScore(name,score){
    this.load();this.playerScore=score;
    const entry={name:(name||'PLAYER').trim().slice(0,10).toUpperCase(),score,date:new Date().toLocaleDateString('th-TH')};
    this.entries.push(entry);this.entries.sort((a,b)=>b.score-a.score);
    this.entries=this.entries.slice(0,RANKING_MAX);
    this.highlightIndex=this.entries.findIndex(e=>e.name===entry.name&&e.score===entry.score);
    this.save();this._t=0;
  }
  update(){this._t++;}
  draw(ctx){
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,'#FFF8E1');g.addColorStop(1,'#FFE082');
    ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
    // Decor
    ['🌟','✨','⭐','🌟'].forEach((e,i)=>{
      const px=[22,WIDTH-28,48,WIDTH-52][i],py=[44,44,HEIGHT-50,HEIGHT-50][i];
      ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.globalAlpha=0.4+Math.sin(Date.now()/700+i)*0.3;ctx.fillText(e,px,py);
    });ctx.globalAlpha=1;
    // Panel
    ctx.fillStyle='rgba(255,248,225,0.94)';ctx.strokeStyle=COL.PRIMARY;ctx.lineWidth=2;
    _rr(ctx,12,56,WIDTH-24,HEIGHT-140,18);ctx.fill();ctx.stroke();
    // Title
    ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 20px '+FONT.MAIN;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🏆 ยอดผู้กล้าแห่ง Tiny Guardian 🏆',WIDTH/2,86);
    // List
    const list=this.entries.length?this.entries:[];const rowH=46,startY=112;
    const medals=['🥇','🥈','🥉'];
    for(let i=0;i<RANKING_MAX;i++){
      const y=startY+i*rowH;const isMe=i===this.highlightIndex;const entry=list[i];
      if(isMe){ctx.fillStyle='rgba(255,236,179,0.5)';ctx.strokeStyle=COL.PRIMARY_D;ctx.lineWidth=1.5;_rr(ctx,18,y+2,WIDTH-36,rowH-4,8);ctx.fill();ctx.stroke();}
      const reveal=Math.min(1,(this._t-i*5)/15);ctx.globalAlpha=Math.max(0,reveal);
      // Medal/number
      ctx.font='17px serif';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(medals[i]||((i+1)+'.'),22,y+rowH/2);
      if(entry){
        ctx.fillStyle=isMe?COL.HUD_TEXT:'rgba(93,64,55,0.7)';
        ctx.font=(isMe?'bold ':'')+('14px "Courier New",monospace');ctx.textAlign='left';
        ctx.fillText(entry.name+(isMe?' ◀':''),54,y+rowH/2-5);
        ctx.fillStyle='#BFA030';ctx.font='10px '+FONT.BODY;
        ctx.fillText(entry.date||'',54,y+rowH/2+9);
        ctx.fillStyle=COL.PRIMARY_D;ctx.font='bold 16px "Courier New",monospace';ctx.textAlign='right';
        ctx.fillText(entry.score.toLocaleString(),WIDTH-18,y+rowH/2);
      } else {
        ctx.fillStyle='rgba(93,64,55,0.25)';ctx.font='14px '+FONT.BODY;ctx.textAlign='left';
        ctx.fillText('---',54,y+rowH/2);
      }
      ctx.globalAlpha=1;
    }
    // Play again
    const by=HEIGHT-80;
    ctx.fillStyle=COL.PRIMARY;_rr(ctx,WIDTH/2-120,by,240,50,14);ctx.fill();
    ctx.strokeStyle=COL.PRIMARY_D;ctx.lineWidth=2;_rr(ctx,WIDTH/2-120,by,240,50,14);ctx.stroke();
    ctx.fillStyle=COL.HUD_TEXT;ctx.font='bold 17px '+FONT.MAIN;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🌟 เล่นอีกครั้ง!',WIDTH/2,by+25);
  }
}
