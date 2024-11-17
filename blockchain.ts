import * as crypto from "crypto-js";

export interface BlockData {
  userId: string;
  candidateId: string;
  timestamp: string;
}

export class Block {
  index: number;
  timestamp: string;
  data: BlockData;
  previousHash: string;
  hash: string;

  constructor(index: number, timestamp: string, data: BlockData, previousHash: string = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  // Calculate the hash for the block
  calculateHash(): string {
    return crypto
      .SHA256(
        this.index + this.previousHash + this.timestamp + JSON.stringify(this.data)
      )
      .toString();
  }

  // Serialize block to a plain object for Firebase compatibility
  toJSON(): Record<string, any> {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      hash: this.hash,
    };
  }

  // Deserialize a plain object back to a Block instance
  static fromJSON(json: Record<string, any>): Block {
    return new Block(
      json.index,
      json.timestamp,
      json.data,
      json.previousHash
    );
  }
}

export class Blockchain {
  private chain: Block[];

  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  private createGenesisBlock(): Block {
    // Use a fixed timestamp for the genesis block to ensure consistency
    return new Block(0, "2023-01-01T00:00:00.000Z", { userId: "0", candidateId: "0", timestamp: "" }, "0");
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  public addBlock(data: BlockData): void {
    const previousBlock = this.getLatestBlock();
    const newBlock = new Block(
      this.chain.length,
      new Date().toISOString(),
      data,
      previousBlock.hash
    );

    this.chain.push(newBlock);
  }

  public isChainValid(): boolean {
    if (!this.isGenesisBlockValid()) {
      console.error("Invalid genesis block");
      return false;
    }

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        console.error(`Hash mismatch at block index ${currentBlock.index}`);
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(`Previous hash mismatch at block index ${currentBlock.index}`);
        return false;
      }
    }

    return true;
  }

  private isGenesisBlockValid(): boolean {
    const genesisBlock = this.createGenesisBlock();
    const currentGenesisBlock = this.chain[0];

    return (
      genesisBlock.hash === currentGenesisBlock.hash &&
      genesisBlock.index === currentGenesisBlock.index &&
      genesisBlock.previousHash === currentGenesisBlock.previousHash
    );
  }

  public getChain(): Block[] {
    return this.chain;
  }

  public serializeChain(): Record<string, any>[] {
    return this.chain.map((block) => block.toJSON());
  }

  public loadChain(serializedChain: Record<string, any>[]): void {
    const loadedChain = serializedChain.map((blockData) => Block.fromJSON(blockData));

    // Validate the loaded chain
    for (let i = 1; i < loadedChain.length; i++) {
      const currentBlock = loadedChain[i];
      const previousBlock = loadedChain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        throw new Error(`Invalid block hash at index ${currentBlock.index}`);
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        throw new Error(`Broken chain at block index ${currentBlock.index}`);
      }
    }

    this.chain = loadedChain;
  }
}
