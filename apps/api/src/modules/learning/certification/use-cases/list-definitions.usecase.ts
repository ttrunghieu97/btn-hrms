import { Injectable } from "@nestjs/common";
import { CertificationRepository } from "../repositories/certification.repository";
import { CreateCertificationDefDto, CertResponseDto } from "../../dto/learning.dto";
@Injectable()
export class ListCertificationDefsUseCase {
  constructor(private readonly repo: CertificationRepository) {}
  async execute(): Promise<any[]> { return this.repo.findDefs(); }
}