import { Injectable } from "@nestjs/common";
import {
  type PositionReaderPort,
  type PositionRecord,
} from "../ports/position-reader.port";
import { PositionsRepository } from "../../modules/organization/positions/repositories/positions.repository";

@Injectable()
export class PositionReaderAdapter implements PositionReaderPort {
  constructor(
    private readonly positionRepo: PositionsRepository,
  ) {}

  async getActive(positionId: string): Promise<PositionRecord | null> {
    const position = await this.positionRepo.getActive(positionId);
    if (!position) return null;

    return {
      id: position.id,
      name: position.name,
      description: position.description,
      isActive: position.isActive,
    };
  }

  async findById(positionId: string): Promise<{ id: string; name: string } | null> {
    return this.positionRepo.findById(positionId);
  }

  async findActiveByTitle(name: string): Promise<PositionRecord | null> {
    const position = await this.positionRepo.findActiveByTitle(name);
    if (!position) return null;

    return {
      id: position.id,
      name: position.name,
      description: position.description,
      isActive: position.isActive,
    };
  }

  async getActivePositions(): Promise<PositionRecord[]> {
    const positions = await this.positionRepo.getActivePositions();
    return positions.map((position) => ({
      id: position.id,
      name: position.name,
      description: position.description,
      isActive: position.isActive,
    }));
  }
}
