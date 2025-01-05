// utils/blockchain.ts

import CryptoJS from "crypto-js";

export interface BlockData {
  userId?: string;
  candidateId?: string;
  timestamp: string;
  isGenesis?: boolean;
  message?: string; // Added for admin blocks
  time?: number;    // Added for admin blocks
}

export class Block {
  public index: number;
  public timestamp: string;
  public data: BlockData;
  public previousHash: string;
  public hash: string;
  public nonce: number;
  name: ReactNode;

  constructor(
    index: number,
    timestamp: string,
    data: BlockData,
    previousHash = "",
    nonce = 0
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }

  /**
   * Sorts the data properties alphabetically to ensure consistent hashing.
   */
  private sortData(): BlockData {
    const sortedData: BlockData = {
      timestamp: ""
    };
    Object.keys(this.data)
      .sort()
      .forEach((key) => {
        sortedData[key as keyof BlockData] = this.data[key as keyof BlockData];
      });
    return sortedData;
  }

  public calculateHash(): string {
    const sortedData = this.sortData();
    return CryptoJS.SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(sortedData) +
        this.nonce
    ).toString();
  }
}

export class Blockchain {
  public chain: Block[];

  constructor() {
    this.chain = [];
    this.createGenesisBlock();
  }

  public createGenesisBlock() { // Changed from private to public
    const genesisBlock = new Block(
      0,
      new Date().toISOString(),
      { isGenesis: true },
      "0",
      0
    );
    this.chain.push(genesisBlock);
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  public addBlock(data: BlockData): void {
    const lastBlock = this.getLatestBlock();
    const newBlock = new Block(
      lastBlock.index + 1,
      new Date().toISOString(),
      data,
      lastBlock.hash,
      0
    );
    this.chain.push(newBlock);
  }

  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }

  public hasUserVoted(userId: string): boolean {
    return this.chain.some(
      (block) => block.data.userId === userId && !block.data.isGenesis
    );
  }
}
