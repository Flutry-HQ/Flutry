import crypto from 'crypto';
import { networkInterfaces } from 'os';

class SnowflakeGenerator {
  private static machineId: number | undefined = undefined;
  private static lastTimestamp = -1;
  private static sequence = 0;

  private static readonly EPOCH = 1672531200000; // 2023-01-01
  private static readonly MACHINE_ID_BITS = 22;
  private static readonly SEQUENCE_BITS = 6;
  private static readonly MAX_MACHINE_ID = (1 << SnowflakeGenerator.MACHINE_ID_BITS) - 1;
  private static readonly MAX_SEQUENCE = (1 << SnowflakeGenerator.SEQUENCE_BITS) - 1;

  private static ensureMachineId() {
    if (this.machineId === undefined) {
      const machineKey = crypto.randomBytes(32).toString('hex');

      const mac = this.getMacAddress();
      const combined = mac + machineKey;
      const hash = crypto.createHash('sha256').update(combined).digest('hex');

      // 16 bit machineId (0-65535)
      this.machineId = parseInt(hash.slice(0, 8), 16) % (SnowflakeGenerator.MAX_MACHINE_ID + 1);
    }
  }

  private static getMacAddress(): string {
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (iface) {
        for (const addr of iface) {
          if (!addr.internal && addr.mac !== '00:00:00:00:00:00') {
            return addr.mac;
          }
        }
      }
    }
    return '00:00:00:00:00:00';
  }

  private static currentTimestamp(): number {
    return Date.now() - SnowflakeGenerator.EPOCH;
  }

  private static waitNextMillis(lastTimestamp: number): number {
    let timestamp = this.currentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTimestamp();
    }
    return timestamp;
  }

  public static generate(): string {
    this.ensureMachineId();
    let timestamp = this.currentTimestamp();

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate id');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & SnowflakeGenerator.MAX_SEQUENCE;
      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    const id =
      (BigInt(timestamp) << BigInt(SnowflakeGenerator.MACHINE_ID_BITS + SnowflakeGenerator.SEQUENCE_BITS)) |
      (BigInt(this.machineId!) << BigInt(SnowflakeGenerator.SEQUENCE_BITS)) |
      BigInt(this.sequence);

    return id.toString();
  }
}

// Expose only the supported ID generation API.
export const Snowflake = {
  generateId: (): string => SnowflakeGenerator.generate(),
};

export default Snowflake;
