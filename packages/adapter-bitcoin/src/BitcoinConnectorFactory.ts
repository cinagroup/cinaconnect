import { ConnectorRegistry } from './types';
import { UnisatConnector } from './connectors/unisat';
import { LeatherConnector } from './connectors/leather';
import { OKXBitcoinConnector } from './connectors/okx';
import { SatsConnectConnector } from './connectors/sats-connect';
import { WalletStandardConnector } from './connectors/wallet-standard';
import { XverseConnector } from './connectors/xverse';

export class BitcoinConnectorFactory {
  private static instance: BitcoinConnectorFactory;
  private registry: ConnectorRegistry;

  private constructor() {
    this.registry = new Map();
    this.registerBuiltInConnectors();
  }

  static getInstance(): BitcoinConnectorFactory {
    if (!BitcoinConnectorFactory.instance) {
      BitcoinConnectorFactory.instance = new BitcoinConnectorFactory();
    }
    return BitcoinConnectorFactory.instance;
  }

  private registerBuiltInConnectors(): void {
    this.register(new UnisatConnector());
    this.register(new LeatherConnector());
    this.register(new OKXBitcoinConnector());
    this.register(new SatsConnectConnector());
    this.register(new WalletStandardConnector());
    this.register(new XverseConnector());
  }

  register(connector: BitcoinConnector): void {
    this.registry.set(connector.id, connector);
  }

  getConnector(id: string): BitcoinConnector | undefined {
    return this.registry.get(id);
  }

  getAllConnectors(): BitcoinConnector[] {
    return Array.from(this.registry.values());
  }

  detectAvailableConnectors(): BitcoinConnector[] {
    return this.getAllConnectors().filter(c => c.isAvailable());
  }

  getRecommendedConnectors(): BitcoinConnector[] {
    const available = this.detectAvailableConnectors();
    const priority = ['unisat', 'xverse', 'leather', 'okx-bitcoin', 'sats-connect', 'wallet-standard'];
    return priority
      .map(id => available.find(c => c.id === id))
      .filter((c): c is BitcoinConnector => c !== undefined);
  }
}

export const bitcoinConnectorFactory = BitcoinConnectorFactory.getInstance();
