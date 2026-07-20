import {
  Bot,
  Crown,
  Footprints,
  Glasses,
  HardHat,
  Headphones,
  Shield,
  Shirt,
  Sparkles,
  Sword,
  VenetianMask,
} from 'lucide-react';

export interface EquippedCharacterItem {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  visual_key: string;
}

export function CharacterAvatar({ items }: { items: EquippedCharacterItem[] }) {
  const equipped = new Map(items.map((item) => [item.slot, item]));
  const body = equipped.get('BODY');
  const head = equipped.get('HEAD');
  const eyes = equipped.get('EYES');
  const hand = equipped.get('HAND');
  const back = equipped.get('BACK');
  const feet = equipped.get('FEET');
  const companion = equipped.get('COMPANION');

  return (
    <div className="character-stage" aria-label="Twoja wyposażona postać">
      <div className="character-halo" />
      {back && (
        <div className={`avatar-item avatar-back visual-${back.visual_key}`} title={back.name}>
          <ItemGlyph visualKey={back.visual_key} />
        </div>
      )}
      <div className="avatar-person">
        <div className="avatar-head">
          <span className="avatar-eye left" />
          <span className="avatar-eye right" />
          <span className="avatar-smile" />
          {eyes && (
            <div className={`avatar-item avatar-eyes visual-${eyes.visual_key}`} title={eyes.name}>
              <ItemGlyph visualKey={eyes.visual_key} />
            </div>
          )}
          {head && (
            <div
              className={`avatar-item avatar-headwear visual-${head.visual_key}`}
              title={head.name}
            >
              <ItemGlyph visualKey={head.visual_key} />
            </div>
          )}
        </div>
        <div className={`avatar-body visual-${body?.visual_key ?? 'body-emerald'}`}>
          <span className="avatar-emblem">MR</span>
        </div>
        <span className="avatar-arm left" />
        <span className="avatar-arm right" />
        <span className="avatar-leg left" />
        <span className="avatar-leg right" />
        {feet && (
          <div className={`avatar-item avatar-feet visual-${feet.visual_key}`} title={feet.name}>
            <ItemGlyph visualKey={feet.visual_key} />
          </div>
        )}
        {hand && (
          <div className={`avatar-item avatar-hand visual-${hand.visual_key}`} title={hand.name}>
            <ItemGlyph visualKey={hand.visual_key} />
          </div>
        )}
      </div>
      {companion && (
        <div
          className={`avatar-item avatar-companion visual-${companion.visual_key}`}
          title={companion.name}
        >
          <ItemGlyph visualKey={companion.visual_key} />
        </div>
      )}
      <div className="character-platform" />
      <div className="character-nameplate">
        <span>TWÓJ BOHATER</span>
        <strong>{items.length} / 7 SLOTÓW</strong>
      </div>
    </div>
  );
}

export function ItemGlyph({ visualKey, size = 28 }: { visualKey: string; size?: number }) {
  if (visualKey.includes('glasses')) return <Glasses size={size} />;
  if (visualKey.includes('headphones')) return <Headphones size={size} />;
  if (visualKey.includes('mask')) return <VenetianMask size={size} />;
  if (visualKey.includes('crown')) return <Crown size={size} />;
  if (visualKey.includes('cap')) return <HardHat size={size} />;
  if (visualKey.includes('sword')) return <Sword size={size} />;
  if (visualKey.includes('shield')) return <Shield size={size} />;
  if (visualKey.includes('boots')) return <Footprints size={size} />;
  if (visualKey.includes('companion')) return <Bot size={size} />;
  if (visualKey.includes('body') || visualKey.includes('coat')) return <Shirt size={size} />;
  return <Sparkles size={size} />;
}
