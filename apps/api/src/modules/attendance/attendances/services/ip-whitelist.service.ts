import { Injectable } from "@nestjs/common";
import * as ipaddr from "ipaddr.js";

/**
 * Validates whether a request IP is within the site's configured CIDR allow-list.
 *
 * Behaviour:
 *   - null/empty allow-list  → allow (no restriction)
 *   - unparseable IP         → deny
 *   - v4-mapped-in-v6 IPs    → normalised to IPv4 before matching
 */
@Injectable()
export class IpWhitelistService {
  isAllowed(
    requestIp: string | null | undefined,
    allowedCidrs: string[] | null | undefined,
  ): boolean {
    if (!allowedCidrs || allowedCidrs.length === 0) {
      return true;
    }
    if (!requestIp) {
      return false;
    }

    let addr: ipaddr.IPv4 | ipaddr.IPv6;
    try {
      addr = ipaddr.parse(requestIp);
      if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        addr = (addr as ipaddr.IPv6).toIPv4Address();
      }
    } catch {
      return false;
    }

    for (const cidr of allowedCidrs) {
      try {
        const [rangeAddr, prefix] = ipaddr.parseCIDR(cidr);
        if (rangeAddr.kind() !== addr.kind()) continue;
        if ((addr as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).match(rangeAddr, prefix)) {
          return true;
        }
      } catch {
        // malformed CIDR in config → skip
        continue;
      }
    }
    return false;
  }
}



