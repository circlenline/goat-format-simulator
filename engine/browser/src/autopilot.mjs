/* Jugador automático mínimo, compartido por la prueba y por la IA rival. */
export function makeAutoPlayer(X){
  const { OcgMessageType:T, OcgResponseType:R, OcgLocation,
          SelectIdleCMDAction:IA, SelectBattleCMDAction:BA, OcgPosition } = X;
  return function decide(m, attempt=0){
    switch(m.type){
      case T.SELECT_IDLECMD: {
        const plan=[];
        if(m.summons?.length)      plan.push({action:IA.SELECT_SUMMON,     index:0});
        if(m.activates?.length)    plan.push({action:IA.SELECT_ACTIVATE,   index:0});
        if(m.spell_sets?.length)   plan.push({action:IA.SELECT_SPELL_SET,  index:0});
        if(m.monster_sets?.length) plan.push({action:IA.SELECT_MONSTER_SET,index:0});
        plan.push({action: m.to_bp ? IA.TO_BP : IA.TO_EP, index:null});
        return { type:R.SELECT_IDLECMD, ...plan[Math.min(attempt, plan.length-1)] };
      }
      case T.SELECT_BATTLECMD:
        if(m.attacks?.length && attempt < m.attacks.length)
          return { type:R.SELECT_BATTLECMD, action:BA.SELECT_BATTLE, index:attempt };
        return { type:R.SELECT_BATTLECMD,
                 action: m.to_m2 ? BA.TO_M2 : BA.TO_EP, index:null };
      case T.SELECT_CHAIN: {
        const N=m.selects?.length??0;
        if(m.forced && N) return { type:R.SELECT_CHAIN, index:attempt%N };
        if(attempt>0 && N) return { type:R.SELECT_CHAIN, index:(attempt-1)%N };
        return { type:R.SELECT_CHAIN, index:null };
      }
      case T.SELECT_EFFECTYN: return { type:R.SELECT_EFFECTYN, yes: attempt===0 };
      case T.SELECT_YESNO:    return { type:R.SELECT_YESNO,    yes: attempt===0 };
      case T.SELECT_OPTION:   return { type:R.SELECT_OPTION,   index: attempt%(m.options?.length||1) };
      case T.SELECT_POSITION: {
        const opts=[OcgPosition.FACEUP_ATTACK,OcgPosition.FACEUP_DEFENSE,
                    OcgPosition.FACEDOWN_DEFENSE].filter(p=>m.positions & p);
        return { type:R.SELECT_POSITION, position: opts[attempt%Math.max(1,opts.length)]
                 ?? OcgPosition.FACEUP_ATTACK };
      }
      case T.SELECT_PLACE:
      case T.SELECT_DISFIELD: {
        // el mask es relativo al jugador preguntado: bytes 0-1 propios, 2-3 rivales
        const self=m.player, foe=1-m.player, mask=m.field_mask>>>0, places=[];
        for(const [byte,player,location] of
            [[0,self,OcgLocation.MZONE],[1,self,OcgLocation.SZONE],
             [2,foe, OcgLocation.MZONE],[3,foe, OcgLocation.SZONE]]){
          const b=(mask>>>(byte*8))&0xff;
          for(let seq=0;seq<5;seq++) if(!((b>>>seq)&1)) places.push({player,location,sequence:seq});
        }
        const n=Math.max(1,m.count??1);
        const off=attempt%Math.max(1,places.length-n+1);
        return { type: m.type===T.SELECT_PLACE ? R.SELECT_PLACE : R.SELECT_DISFIELD,
                 places: places.slice(off, off+n) };
      }
      case T.SELECT_UNSELECT_CARD: {
        const N=m.select_cards?.length??0;
        if(m.can_finish && attempt>=N) return { type:R.SELECT_UNSELECT_CARD, index:null };
        return { type:R.SELECT_UNSELECT_CARD, index: N ? attempt%N : null };
      }
      case T.SELECT_CARD:
      case T.SELECT_TRIBUTE: {
        const N=m.selects?.length??0;
        if(!N) return { type:R.SELECT_CARD, indicies:null };
        const min=Math.max(1,m.min??1), max=Math.min(m.max??min, N);
        const count=Math.min(Math.max(min,1), Math.max(max,1));
        const window=Math.max(1, N-count+1);
        if(attempt>=window && m.can_cancel) return { type:R.SELECT_CARD, indicies:null };
        const start=attempt%window;
        return { type: m.type===T.SELECT_TRIBUTE ? R.SELECT_TRIBUTE : R.SELECT_CARD,
                 indicies: Array.from({length:count},(_,i)=>start+i) };
      }
      case T.SORT_CARD: return { type:R.SORT_CARD, order:null };
      case T.ANNOUNCE_RACE: {
        const bits=[]; const a=BigInt(m.available);
        for(let i=0n;i<64n;i++) if((a>>i)&1n) bits.push(1n<<i);
        return { type:R.ANNOUNCE_RACE, races: bits.slice(attempt, attempt+(m.count??1)) };
      }
      case T.ANNOUNCE_ATTRIB: {
        const bits=[]; for(let i=0;i<32;i++) if((m.available>>i)&1) bits.push(1<<i);
        return { type:R.ANNOUNCE_ATTRIB, attributes: bits.slice(attempt, attempt+(m.count??1)) };
      }
      case T.ANNOUNCE_NUMBER: return { type:R.ANNOUNCE_NUMBER, value: attempt };
      case T.ANNOUNCE_CARD:
        // último recurso: el cerebro y la interfaz lo resuelven antes
        return { type:R.ANNOUNCE_CARD, card: 55144522 };
      default: return null;
    }
  };
}
