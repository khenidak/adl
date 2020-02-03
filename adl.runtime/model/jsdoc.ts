import { JSDocableNode, Project, ClassDeclaration, JSDocStructure, SourceFile, InterfaceDeclaration, EnumDeclaration, Type, VariableDeclarationKind, IndentationText, QuoteKind, MethodDeclaration, Directory } from 'ts-morph';
import { length, values, IterableWithLinq } from '@azure-tools/linq';

export interface TagInfo {
  tag: string;
  fullText?: string;
  value?: string;
  message?: string;
}

export function getTags(node: JSDocableNode, name: string): IterableWithLinq<TagInfo> {
  return values(node.getJsDocs()).selectMany(each => values(each.getTags()).where(each => each.getTagName() === name)).select(each => {
    const fullText = each.getComment();
    const s = fullText?.split(' ', 2);
    return {
      tag: name,
      fullText,
      value: s?.[0],
      message: s?.[1]
    };
  });
}