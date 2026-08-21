import type { SignageReportBoard } from "./signage-report-data";
import type { RoadsideContract } from "./roadside-contracts";

/** يحول العقود الطرقية والجدارية والمنصفات إلى بطاقات تقرير موحّدة، للنشاط والأرشيف معاً. */
export function roadsideContractsToReportBoards(contracts: RoadsideContract[]): SignageReportBoard[] {
  return contracts.flatMap((contract) => contract.type === "island"
    ? [{
      id: `${contract.id}-island`, contractId: contract.id, contractName: contract.name, ownerCompany: contract.ownerCompany, responsiblePhone: contract.responsiblePhone, totalBoards: contract.totalBoards,
      type: contract.type, region: contract.boards[0]?.linkedRegions?.join(" · ") || contract.boards[0]?.region, address: contract.boards[0]?.address, responsible: contract.ownerCompany,
      brand: contract.boards[0]?.frontBrand || contract.boards[0]?.brand, backBrand: contract.boards[0]?.backBrand, sides: contract.boards[0]?.sides, boardType: contract.boards[0]?.boardType, rating: contract.boards[0]?.rating,
      widthCm: contract.boards[0]?.widthCm, heightCm: contract.boards[0]?.heightCm, islandCount: contract.totalBoards, installDate: contract.startDate, contractEndDate: contract.endDate,
      imageUri: contract.boards[0]?.frontImageUri || contract.boards[0]?.imageUri, frontImageUri: contract.boards[0]?.frontImageUri || contract.boards[0]?.imageUri, backImageUri: contract.boards[0]?.backImageUri,
    }]
    : contract.boards.map((board) => ({
      id: board.id, contractId: contract.id, contractName: contract.name, ownerCompany: contract.ownerCompany, responsiblePhone: contract.responsiblePhone, totalBoards: contract.totalBoards,
      type: contract.type, region: board.region, address: board.address, responsible: contract.ownerCompany, brand: board.frontBrand || board.brand, backBrand: board.backBrand,
      sides: board.sides, boardType: board.boardType, rating: board.rating, widthCm: board.widthCm, heightCm: board.heightCm, installDate: contract.startDate, contractEndDate: contract.endDate,
      imageUri: board.frontImageUri || board.imageUri, frontImageUri: board.frontImageUri || board.imageUri, backImageUri: board.backImageUri,
    })));
}
