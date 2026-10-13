export interface FrenchFoldSheetData {
    itemRefId: string;
    title: string;
    lockSigil: string;
    verificationSeal: string;
    interiorTitle: string;
    interiorBody: string;
    roleTags?: string[];
    singleSidedNote?: string;
}
export declare function renderFrenchFoldSvg(data: FrenchFoldSheetData): string;
//# sourceMappingURL=french-fold.d.ts.map