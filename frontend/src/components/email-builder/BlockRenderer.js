'use client';

import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import ButtonBlock from './blocks/ButtonBlock';
import DividerBlock from './blocks/DividerBlock';
import SpacerBlock from './blocks/SpacerBlock';
import { Columns2Block, Columns3Block } from './blocks/ColumnsBlock';
import HeroBlock from './blocks/HeroBlock';
import FooterBlock from './blocks/FooterBlock';

/**
 * Renders the correct block component for a given block object.
 * `onChange` is called with partial props updates.
 */
export default function BlockRenderer({ block, isSelected, onChange }) {
  const common = { block, isSelected, onChange };

  switch (block.type) {
    case 'text':     return <TextBlock     {...common} />;
    case 'heading':  return <HeadingBlock  {...common} />;
    case 'image':    return <ImageBlock    {...common} />;
    case 'button':   return <ButtonBlock   {...common} />;
    case 'divider':  return <DividerBlock  {...common} />;
    case 'spacer':   return <SpacerBlock   {...common} />;
    case 'columns2': return <Columns2Block {...common} />;
    case 'columns3': return <Columns3Block {...common} />;
    case 'hero':     return <HeroBlock     {...common} />;
    case 'footer':   return <FooterBlock   {...common} />;
    default:
      return (
        <div className="p-4 text-sm text-muted-foreground italic text-center">
          Unknown block type: {block.type}
        </div>
      );
  }
}
