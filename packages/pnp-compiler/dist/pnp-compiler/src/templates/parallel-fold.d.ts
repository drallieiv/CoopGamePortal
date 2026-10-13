export interface ParallelFoldSheetData {
    itemRefId: string;
    title: string;
    lockSigil: string;
    verificationSeal: string;
    interiorTitle: string;
    interiorBody: string;
    roleTags?: string[];
    singleSidedNote?: string;
}
export declare function renderDoubleParallelFoldSvg(data: ParallelFoldSheetData): string;
//# sourceMappingURL=parallel-fold.d.ts.map