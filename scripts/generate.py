#!/usr/bin/env python3
"""
EC2 and RDS Instance Data Generator

Scrapes AWS EC2 and RDS documentation and generates:
1. EC2 family JSON files (data/ec2/families/*.json)
2. EC2 instance type JSON files (data/ec2/instances/*.json)
3. EC2 info manifest file (data/ec2/info.json)
4. RDS family JSON files (data/rds/families/*.json)
5. RDS instance class JSON files (data/rds/instances/*.json)
6. RDS info manifest file (data/rds/info.json)
7. TypeScript type definitions (lib/types.ts)
"""

import json
import re
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Any

import requests
from bs4 import BeautifulSoup

# === Configuration ===
EC2_CATEGORIES = {
    "general_purpose": "https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html",
    "compute_optimized": "https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html",
    "memory_optimized": "https://docs.aws.amazon.com/ec2/latest/instancetypes/mo.html",
    "storage_optimized": "https://docs.aws.amazon.com/ec2/latest/instancetypes/so.html",
    "accelerated_computing": "https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html",
    "hpc": "https://docs.aws.amazon.com/ec2/latest/instancetypes/hpc.html",
}

RDS_URL = "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Summary.html"

RDS_CATEGORIES = [
    "general_purpose",
    "memory_optimized",
    "compute_optimized",
    "burstable_performance",
]

ELASTICACHE_URL = "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html"

ELASTICACHE_CATEGORIES = [
    "general_purpose",
    "memory_optimized",
    "network_optimized",
    "burstable_performance",
]

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "data"
EC2_OUTPUT_DIR = OUTPUT_DIR / "ec2"
RDS_OUTPUT_DIR = OUTPUT_DIR / "rds"
ELASTICACHE_OUTPUT_DIR = OUTPUT_DIR / "elasticache"
TYPES_OUTPUT = SCRIPT_DIR.parent / "lib" / "types.ts"


# === Data Classes ===
@dataclass
class FamilySummary:
    hypervisor: str
    processorArchitecture: str
    metalAvailable: bool
    dedicatedHosts: bool
    spot: bool
    hibernation: bool
    operatingSystems: list[str]


@dataclass
class PerformanceSpec:
    memoryGiB: float
    processor: str
    vCPUs: int
    cpuCores: int
    threadsPerCore: int
    accelerators: str | None
    acceleratorMemory: str | None


@dataclass
class BandwidthSpec:
    baseline: float | None
    burst: float | None


@dataclass
class NetworkSpec:
    bandwidthGbps: BandwidthSpec | str
    efa: bool
    ena: bool | str
    enaExpress: bool
    networkCards: int
    maxInterfaces: int
    ipv4PerInterface: int
    ipv6: bool


@dataclass
class VolumeLimitSpec:
    limit: int
    limitType: str  # "shared", "dedicated", "xen"


@dataclass
class EBSSpec:
    bandwidthMbps: BandwidthSpec | str
    throughputMBps: BandwidthSpec | str
    iops: BandwidthSpec | str
    nvme: bool
    volumeLimit: VolumeLimitSpec | str


@dataclass
class InstanceStoreSpec:
    volumes: str
    storeType: str
    readIOPS: str
    writeIOPS: str
    needsInit: bool | None
    trimSupport: bool | None


@dataclass
class SecuritySpec:
    ebsEncryption: bool
    instanceStoreEncryption: bool | str | None
    encryptionInTransit: bool
    amdSEVSNP: bool
    nitroTPM: bool
    nitroEnclaves: bool


@dataclass
class InstanceDetails:
    instanceType: str
    family: str
    category: str
    # Flattened familySummary fields
    hypervisor: str
    processorArchitecture: str
    metalAvailable: bool
    dedicatedHosts: bool
    spot: bool
    hibernation: bool
    operatingSystems: list[str]
    # Flattened performance fields
    memoryGiB: float
    processor: str
    vCPUs: int
    cpuCores: int
    threadsPerCore: int
    accelerators: str | None
    acceleratorMemory: str | None
    # Nested specs
    network: NetworkSpec
    ebs: EBSSpec
    instanceStore: InstanceStoreSpec | None
    security: SecuritySpec


@dataclass
class FamilyData:
    family: str
    category: str
    instanceTypes: list[str]
    hypervisor: str
    processorArchitecture: str
    metalAvailable: bool
    dedicatedHosts: bool
    spot: bool
    hibernation: bool
    operatingSystems: list[str]


# === RDS Data Classes ===
@dataclass
class RDSInstanceDetails:
    instanceClass: str
    family: str
    category: str
    vCPUs: int
    memoryGiB: float
    networkBandwidthGbps: str
    ebsBandwidthMbps: str


@dataclass
class RDSFamilyData:
    family: str
    category: str
    instanceClasses: list[str]


# === Elasticache Data Classes ===
@dataclass
class ElastiCacheNodeDetails:
    nodeType: str
    family: str
    category: str
    vCPUs: int | None
    memoryGiB: float | None
    networkPerformance: str
    baselineBandwidthGbps: str | None
    burstBandwidthGbps: str | None


@dataclass
class ElastiCacheFamilyData:
    family: str
    category: str
    nodeTypes: list[str]


# === Text Cleaning Functions ===
def clean_text(text: str) -> str:
    """Remove malformed unicode and clean whitespace."""
    cleaned = text.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def clean_instance_type(instance_type: str) -> str:
    """Remove footnote markers from instance type names."""
    return re.sub(
        r"(\d*xlarge|metal(?:-\d+xl)?|nano|micro|small|medium|large)\d+$",
        r"\1",
        instance_type,
    )


def clean_hypervisor(hypervisor: str) -> str:
    """Remove footnote markers from hypervisor values."""
    return re.sub(r"\s*[*]+\s*$", "", hypervisor).strip()


def clean_operating_system(os_value: str | list) -> list[str]:
    """Clean OS values and always return a list."""
    def clean_single(val: str) -> str:
        cleaned = re.sub(r"\d+$", "", val)
        cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", cleaned)
        return cleaned.strip()

    if isinstance(os_value, str):
        return [clean_single(os_value)]
    elif isinstance(os_value, list):
        return [clean_single(v) for v in os_value]
    return []


def to_snake_case(text: str) -> str:
    """Convert text to snake_case."""
    text = re.sub(r"[().]", "", text)
    text = re.sub(r"[/]", "_", text)
    text = re.sub(r"[\s\-]+", "_", text)
    text = text.lower()
    text = re.sub(r"_+", "_", text)
    return text.strip("_")


def to_camel_case(snake_str: str) -> str:
    """Convert snake_case to camelCase with special acronym handling."""
    # Special case mappings for common acronyms and terms
    acronym_map = {
        "vcpus": "vCPUs",
        "gib": "GiB",
        "gbps": "Gbps",
        "mbps": "Mbps",
        "mb_s": "MBps",
        "iops": "IOPS",
        "ebs": "ebs",  # lowercase at start
        "ena": "ena",
        "efa": "efa",
        "ipv4": "ipv4",
        "ipv6": "ipv6",
        "nvme": "nvme",
        "amd": "amd",
        "sev": "SEV",
        "snp": "SNP",
        "tpm": "TPM",
    }

    # Handle specific full field names that need special treatment
    special_cases = {
        "vcpus": "vCPUs",
        "memory_gib": "memoryGiB",
        "bandwidth_gbps": "bandwidthGbps",
        "bandwidth_mbps": "bandwidthMbps",
        "throughput_mb_s": "throughputMBps",
        "read_iops": "readIOPS",
        "write_iops": "writeIOPS",
        "ipv4_per_interface": "ipv4PerInterface",
        "ipv6": "ipv6",
        "amd_sev_snp": "amdSEVSNP",
        "nitrotpm": "nitroTPM",
    }

    if snake_str in special_cases:
        return special_cases[snake_str]

    # Standard conversion: split by underscore and capitalize each word except first
    parts = snake_str.split("_")
    if not parts:
        return snake_str

    # First part stays lowercase, rest get capitalized
    result = parts[0].lower()
    for part in parts[1:]:
        if part.lower() in acronym_map:
            result += acronym_map[part.lower()]
        else:
            result += part.capitalize()

    return result


# === Value Parsing Functions ===
def parse_basic_value(value: str) -> Any:
    """Convert string to appropriate Python type."""
    if not value:
        return value
    if value.lower() == "yes":
        return True
    if value.lower() == "no":
        return False
    if "|" in value:
        return [item.strip() for item in value.split("|") if item.strip()]
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        pass
    return value


def parse_bandwidth(value: str | int | float) -> BandwidthSpec | str:
    """Parse bandwidth strings like '0.75 / 10.0' or '100 Gigabit'."""
    if isinstance(value, (int, float)):
        return BandwidthSpec(baseline=float(value), burst=None)

    if not isinstance(value, str):
        return BandwidthSpec(baseline=None, burst=None)

    # Handle "X / Y" format
    if "/" in value and "Gigabit" not in value:
        parts = value.split("/")
        if len(parts) == 2:
            try:
                baseline = float(parts[0].strip())
                burst = float(parts[1].strip())
                return BandwidthSpec(baseline=baseline, burst=burst)
            except ValueError:
                pass

    # Keep descriptive values as strings (e.g., "100 Gigabit", "High")
    return value


def parse_volume_limit(value: str) -> VolumeLimitSpec | str:
    """Parse volume limit strings like 'Up to 27 (Shared limit)'."""
    if not isinstance(value, str):
        return value

    # Pattern: "Up to N (Type limit)" or "N (Type limit)"
    match = re.match(r"(?:Up to\s+)?(\d+)\s*\((\w+)(?:[- ]based)?\s*limit\)", value, re.I)
    if match:
        limit = int(match.group(1))
        limit_type = match.group(2).lower()
        return VolumeLimitSpec(limit=limit, limitType=limit_type)

    return value


def parse_iops(value: str) -> tuple[str, str]:
    """Parse IOPS string like '2,146,664 / 1,073,336' into read/write."""
    if not isinstance(value, str) or "/" not in value:
        return (value, "") if value else ("", "")

    parts = value.split("/")
    if len(parts) == 2:
        return (parts[0].strip(), parts[1].strip())
    return (value, "")


# === Family Extraction ===
def extract_family_from_instance_type(instance_type: str) -> str:
    """Extract family name from instance type (e.g., 'm5.large' -> 'M5')."""
    parts = instance_type.split(".")
    if not parts:
        return instance_type
    family_part = parts[0]
    # Capitalize first letter, preserve rest (for things like 'c7i-flex')
    return family_part[0].upper() + family_part[1:]


# === HTML Parsing ===
def fetch_html(url: str) -> str:
    """Fetch HTML content from URL."""
    response = requests.get(url)
    response.raise_for_status()
    return response.text


def parse_table(table) -> list[dict]:
    """Parse an HTML table into a list of dictionaries."""
    headers = []
    header_row = table.find("thead")
    if header_row:
        headers = [
            to_snake_case(clean_text(th.get_text(strip=True)))
            for th in header_row.find_all("th")
        ]

    rows = []
    tbody = table.find("tbody")
    row_container = tbody if tbody else table

    for tr in row_container.find_all("tr"):
        cells = tr.find_all("td")
        if not cells:
            continue

        row_data = {}
        for i, cell in enumerate(cells):
            value = clean_text(cell.get_text(strip=True))
            value = parse_basic_value(value)

            if i < len(headers):
                header = headers[i]
                # Clean specific fields
                if header == "instance_type" and isinstance(value, str):
                    value = clean_instance_type(value)
                elif header == "hypervisor" and isinstance(value, str):
                    value = clean_hypervisor(value)
                elif header == "supported_operating_systems":
                    value = clean_operating_system(value)
                row_data[header] = value
            else:
                row_data[f"column_{i}"] = value

        if row_data and len(row_data) > 1:
            rows.append(row_data)

    return rows


def parse_category_page(html: str) -> dict:
    """Parse an EC2 category page and extract all tables."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")

    section_names = [
        None,  # Skip first table (instance families and types list)
        "instance_family_summary",
        "performance_specifications",
        "network_specifications",
        "ebs_specifications",
        "instance_store_specifications",
        "security_specifications",
    ]

    data = {}
    for i, table in enumerate(tables):
        section_name = section_names[i] if i < len(section_names) else f"table_{i}"
        if section_name is None:
            continue
        parsed = parse_table(table)
        if parsed:
            data[section_name] = parsed

    return data


# === Data Transformation ===
def build_family_summary(raw: dict) -> FamilySummary:
    """Build FamilySummary from raw parsed data."""
    os_value = raw.get("supported_operating_systems", [])
    if isinstance(os_value, str):
        os_value = [os_value]

    return FamilySummary(
        hypervisor=raw.get("hypervisor", ""),
        processorArchitecture=raw.get("processor_type_architecture", ""),
        metalAvailable=bool(raw.get("metal_instances_available", False)),
        dedicatedHosts=bool(raw.get("dedicated_hosts_support", False)),
        spot=bool(raw.get("spot_support", False)),
        hibernation=bool(raw.get("hibernation_support", False)),
        operatingSystems=os_value,
    )


def build_performance_spec(raw: dict) -> PerformanceSpec:
    """Build PerformanceSpec from raw parsed data."""
    accelerators = raw.get("accelerators")
    if accelerators is False or accelerators == "":
        accelerators = None

    accelerator_memory = raw.get("accelerator_memory")
    if accelerator_memory is False or accelerator_memory == "":
        accelerator_memory = None

    return PerformanceSpec(
        memoryGiB=float(raw.get("memory_gib", 0)),
        processor=raw.get("processor", ""),
        vCPUs=int(raw.get("vcpus", 0)),
        cpuCores=int(raw.get("cpu_cores", 0)),
        threadsPerCore=int(raw.get("threads_per_core", 1)),
        accelerators=accelerators,
        acceleratorMemory=accelerator_memory,
    )


def build_network_spec(raw: dict) -> NetworkSpec:
    """Build NetworkSpec from raw parsed data."""
    return NetworkSpec(
        bandwidthGbps=parse_bandwidth(raw.get("baseline_burst_bandwidth_gbps", "")),
        efa=bool(raw.get("efa", False)),
        ena=raw.get("ena", False),
        enaExpress=bool(raw.get("ena_express", False)),
        networkCards=int(raw.get("network_cards", 1)),
        maxInterfaces=int(raw.get("max_network_interfaces", 1)),
        ipv4PerInterface=int(raw.get("ip_addresses_per_interface", 1)),
        ipv6=bool(raw.get("ipv6", False)),
    )


def build_ebs_spec(raw: dict) -> EBSSpec:
    """Build EBSSpec from raw parsed data."""
    return EBSSpec(
        bandwidthMbps=parse_bandwidth(raw.get("baseline_maximum_bandwidth_mbps", "")),
        throughputMBps=parse_bandwidth(
            raw.get("baseline_maximum_throughput_mb_s,_128_kib_i_o", "")
        ),
        iops=parse_bandwidth(raw.get("baseline_maximum_iops_16_kib_i_o", "")),
        nvme=bool(raw.get("nvme", False)),
        volumeLimit=parse_volume_limit(raw.get("ebs_volume_limit", "")),
    )


def build_instance_store_spec(raw: dict) -> InstanceStoreSpec | None:
    """Build InstanceStoreSpec from raw parsed data."""
    if not raw:
        return None

    iops_str = raw.get("100%_random_read_iops_write_iops", "")
    read_iops, write_iops = parse_iops(iops_str)

    needs_init = raw.get("needs_initialization1")
    if needs_init == "" or needs_init is None:
        needs_init = None

    trim_support = raw.get("trim_support2")
    if trim_support == "" or trim_support is None:
        trim_support = None

    return InstanceStoreSpec(
        volumes=raw.get("instance_store_volumes", ""),
        storeType=raw.get("instance_store_type", ""),
        readIOPS=read_iops,
        writeIOPS=write_iops,
        needsInit=needs_init,
        trimSupport=trim_support,
    )


def build_security_spec(raw: dict) -> SecuritySpec:
    """Build SecuritySpec from raw parsed data."""
    inst_store_enc = raw.get("instance_store_encryption")
    if inst_store_enc == "Instance store not supported":
        inst_store_enc = None

    return SecuritySpec(
        ebsEncryption=bool(raw.get("ebs_encryption", False)),
        instanceStoreEncryption=inst_store_enc,
        encryptionInTransit=bool(raw.get("encryption_in_transit", False)),
        amdSEVSNP=bool(raw.get("amd_sev_snp", False)),
        nitroTPM=bool(raw.get("nitrotpm", False)),
        nitroEnclaves=bool(raw.get("nitro_enclaves", False)),
    )


def process_category_data(raw_data: dict, category: str) -> dict[str, InstanceDetails]:
    """Process raw category data into InstanceDetails objects."""
    # Build lookup tables by instance_type
    family_summaries = {
        item["instance_family"]: build_family_summary(item)
        for item in raw_data.get("instance_family_summary", [])
        if "instance_family" in item
    }

    performance = {
        item["instance_type"]: build_performance_spec(item)
        for item in raw_data.get("performance_specifications", [])
        if "instance_type" in item
    }

    network = {
        item["instance_type"]: build_network_spec(item)
        for item in raw_data.get("network_specifications", [])
        if "instance_type" in item
    }

    ebs = {
        item["instance_type"]: build_ebs_spec(item)
        for item in raw_data.get("ebs_specifications", [])
        if "instance_type" in item
    }

    instance_store = {
        item["instance_type"]: build_instance_store_spec(item)
        for item in raw_data.get("instance_store_specifications", [])
        if "instance_type" in item
    }

    security = {
        item["instance_type"]: build_security_spec(item)
        for item in raw_data.get("security_specifications", [])
        if "instance_type" in item
    }

    # Build InstanceDetails for each instance type
    instances = {}
    for instance_type in performance.keys():
        family_name = extract_family_from_instance_type(instance_type)
        family_summary = family_summaries.get(family_name)

        if not family_summary:
            # Try case-insensitive match
            for fname, fsummary in family_summaries.items():
                if fname.lower() == family_name.lower():
                    family_summary = fsummary
                    family_name = fname
                    break

        if not family_summary:
            # Create a default summary if not found
            family_summary = FamilySummary(
                hypervisor="",
                processorArchitecture="",
                metalAvailable=False,
                dedicatedHosts=False,
                spot=False,
                hibernation=False,
                operatingSystems=[],
            )

        perf = performance.get(
            instance_type,
            PerformanceSpec(0, "", 0, 0, 1, None, None),
        )

        instances[instance_type] = InstanceDetails(
            instanceType=instance_type,
            family=family_name,
            category=category,
            # Flattened familySummary fields
            hypervisor=family_summary.hypervisor,
            processorArchitecture=family_summary.processorArchitecture,
            metalAvailable=family_summary.metalAvailable,
            dedicatedHosts=family_summary.dedicatedHosts,
            spot=family_summary.spot,
            hibernation=family_summary.hibernation,
            operatingSystems=family_summary.operatingSystems,
            # Flattened performance fields
            memoryGiB=perf.memoryGiB,
            processor=perf.processor,
            vCPUs=perf.vCPUs,
            cpuCores=perf.cpuCores,
            threadsPerCore=perf.threadsPerCore,
            accelerators=perf.accelerators,
            acceleratorMemory=perf.acceleratorMemory,
            # Nested specs
            network=network.get(
                instance_type,
                NetworkSpec("", False, False, False, 1, 1, 1, False),
            ),
            ebs=ebs.get(instance_type, EBSSpec("", "", "", False, "")),
            instanceStore=instance_store.get(instance_type),
            security=security.get(
                instance_type,
                SecuritySpec(False, None, False, False, False, False),
            ),
        )

    return instances


def group_instances_by_family(
    all_instances: dict[str, InstanceDetails],
) -> dict[str, FamilyData]:
    """Group instances by family."""
    families: dict[str, FamilyData] = {}

    for instance_type, details in all_instances.items():
        family_name = details.family

        if family_name not in families:
            families[family_name] = FamilyData(
                family=family_name,
                category=details.category,
                instanceTypes=[],
                hypervisor=details.hypervisor,
                processorArchitecture=details.processorArchitecture,
                metalAvailable=details.metalAvailable,
                dedicatedHosts=details.dedicatedHosts,
                spot=details.spot,
                hibernation=details.hibernation,
                operatingSystems=details.operatingSystems,
            )

        families[family_name].instanceTypes.append(instance_type)

    # Sort instance types within each family
    for family in families.values():
        family.instanceTypes.sort()

    return families


# === RDS Parsing and Processing ===
def extract_rds_family(instance_class: str) -> str:
    """Extract family name from RDS instance class (e.g., 'db.m5.large' -> 'M5')."""
    # Remove 'db.' prefix and get the family part
    if instance_class.startswith("db."):
        parts = instance_class[3:].split(".")
        if parts:
            family_part = parts[0]
            # Capitalize first letter, preserve rest
            return family_part[0].upper() + family_part[1:]
    return instance_class


def determine_rds_category(family: str) -> str:
    """Determine RDS category based on family prefix."""
    family_lower = family.lower()

    # Burstable performance (T series)
    if family_lower.startswith("t"):
        return "burstable_performance"

    # Memory optimized (R, X, Z series)
    if family_lower.startswith(("r", "x", "z")):
        return "memory_optimized"

    # Compute optimized (C series)
    if family_lower.startswith("c"):
        return "compute_optimized"

    # General purpose (M series and others)
    return "general_purpose"


def clean_rds_instance_class(instance_class: str) -> str:
    """Remove footnote markers and special characters from RDS instance class names."""
    # Remove trailing asterisks and other footnote markers
    cleaned = re.sub(r"[*]+$", "", instance_class)
    return cleaned.strip()


def parse_rds_table(table) -> list[dict]:
    """Parse an RDS HTML table into a list of dictionaries."""
    headers = []
    header_row = table.find("thead")
    if header_row:
        headers = [
            to_snake_case(clean_text(th.get_text(strip=True)))
            for th in header_row.find_all("th")
        ]

    rows = []
    tbody = table.find("tbody")
    row_container = tbody if tbody else table

    for tr in row_container.find_all("tr"):
        cells = tr.find_all("td")
        if not cells:
            continue

        row_data = {}
        for i, cell in enumerate(cells):
            value = clean_text(cell.get_text(strip=True))

            if i < len(headers):
                header = headers[i]
                # Clean instance class names
                if header == "instance_class" and isinstance(value, str):
                    value = clean_rds_instance_class(value)
                row_data[header] = value
            else:
                row_data[f"column_{i}"] = value

        if row_data and "instance_class" in row_data:
            rows.append(row_data)

    return rows


def parse_rds_page(html: str) -> list[dict]:
    """Parse the RDS instance class summary page."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")

    all_instances = []

    for table in tables:
        rows = parse_rds_table(table)
        all_instances.extend(rows)

    return all_instances


def process_rds_data(raw_instances: list[dict]) -> dict[str, RDSInstanceDetails]:
    """Process raw RDS data into RDSInstanceDetails objects."""
    instances = {}

    for raw in raw_instances:
        instance_class = raw.get("instance_class", "")
        if not instance_class or not instance_class.startswith("db."):
            continue

        family = extract_rds_family(instance_class)
        category = determine_rds_category(family)

        # Parse vCPUs
        vcpus_str = raw.get("vcpu", raw.get("vcpus", "0"))
        try:
            vcpus = int(vcpus_str)
        except (ValueError, TypeError):
            vcpus = 0

        # Parse memory
        memory_str = raw.get("memory_gib", raw.get("memory", "0"))
        try:
            memory = float(str(memory_str).replace(",", ""))
        except (ValueError, TypeError):
            memory = 0.0

        # Network bandwidth
        network = raw.get("network_bandwidth_gbps", raw.get("network_bandwidth", ""))

        # EBS bandwidth
        ebs = raw.get("max_ebs_bandwidth_mbps", raw.get("ebs_bandwidth", ""))

        instances[instance_class] = RDSInstanceDetails(
            instanceClass=instance_class,
            family=family,
            category=category,
            vCPUs=vcpus,
            memoryGiB=memory,
            networkBandwidthGbps=str(network),
            ebsBandwidthMbps=str(ebs),
        )

    return instances


def group_rds_instances_by_family(
    all_instances: dict[str, RDSInstanceDetails],
) -> dict[str, RDSFamilyData]:
    """Group RDS instances by family."""
    families: dict[str, RDSFamilyData] = {}

    for instance_class, details in all_instances.items():
        family_name = details.family

        if family_name not in families:
            families[family_name] = RDSFamilyData(
                family=family_name,
                category=details.category,
                instanceClasses=[],
            )

        families[family_name].instanceClasses.append(instance_class)

    # Sort instance classes within each family
    for family in families.values():
        family.instanceClasses.sort()

    return families


# === Elasticache Parsing and Processing ===
def extract_elasticache_family(node_type: str) -> str:
    """Extract family name from Elasticache node type (e.g., 'cache.m5.large' -> 'M5')."""
    if node_type.startswith("cache."):
        parts = node_type[6:].split(".")
        if parts:
            family_part = parts[0]
            return family_part[0].upper() + family_part[1:]
    return node_type


def determine_elasticache_category(family: str) -> str:
    """Determine Elasticache category based on family prefix."""
    family_lower = family.lower()

    # Burstable performance (T series)
    if family_lower.startswith("t"):
        return "burstable_performance"

    # Memory optimized (R series)
    if family_lower.startswith("r"):
        return "memory_optimized"

    # Network optimized (C7gn series)
    if family_lower.startswith("c"):
        return "network_optimized"

    # General purpose (M series and others)
    return "general_purpose"


def clean_elasticache_node_type(node_type: str) -> str:
    """Remove footnote markers from Elasticache node type names."""
    cleaned = re.sub(r"[*]+$", "", node_type)
    return cleaned.strip()


def parse_elasticache_table(table) -> list[dict]:
    """Parse an Elasticache HTML table into a list of dictionaries."""
    headers = []
    header_row = table.find("thead")
    if header_row:
        headers = [
            to_snake_case(clean_text(th.get_text(strip=True)))
            for th in header_row.find_all("th")
        ]

    rows = []
    tbody = table.find("tbody")
    row_container = tbody if tbody else table

    for tr in row_container.find_all("tr"):
        cells = tr.find_all("td")
        if not cells:
            continue

        row_data = {}
        for i, cell in enumerate(cells):
            value = clean_text(cell.get_text(strip=True))

            if i < len(headers):
                header = headers[i]
                # Clean node type names
                if header in ("node_type", "instance_type") and isinstance(value, str):
                    value = clean_elasticache_node_type(value)
                row_data[header] = value
            else:
                row_data[f"column_{i}"] = value

        # Check for node_type or instance_type field
        node_type = row_data.get("node_type") or row_data.get("instance_type")
        if node_type and node_type.startswith("cache."):
            row_data["node_type"] = node_type
            rows.append(row_data)

    return rows


def parse_elasticache_page(html: str) -> list[dict]:
    """Parse the Elasticache node types page."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")

    all_nodes = []

    for table in tables:
        rows = parse_elasticache_table(table)
        all_nodes.extend(rows)

    return all_nodes


def process_elasticache_data(raw_nodes: list[dict]) -> dict[str, ElastiCacheNodeDetails]:
    """Process raw Elasticache data into ElastiCacheNodeDetails objects."""
    nodes = {}

    for raw in raw_nodes:
        node_type = raw.get("node_type", "")
        if not node_type or not node_type.startswith("cache."):
            continue

        # Skip duplicates (same node may appear in multiple tables)
        if node_type in nodes:
            continue

        family = extract_elasticache_family(node_type)
        category = determine_elasticache_category(family)

        # Parse vCPUs (may not be present for all node types)
        vcpus_str = raw.get("vcpus", raw.get("vcpu", ""))
        vcpus = None
        if vcpus_str:
            try:
                vcpus = int(vcpus_str)
            except (ValueError, TypeError):
                pass

        # Parse memory
        memory_str = raw.get("memory_gib", raw.get("memory", ""))
        memory = None
        if memory_str:
            try:
                memory = float(str(memory_str).replace(",", ""))
            except (ValueError, TypeError):
                pass

        # Network performance
        network = raw.get("network_performance", "")

        # Bandwidth
        baseline = raw.get("baseline_bandwidth_gbps", raw.get("baseline_gbps", ""))
        burst = raw.get("burst_bandwidth_gbps", raw.get("burst_gbps", ""))

        nodes[node_type] = ElastiCacheNodeDetails(
            nodeType=node_type,
            family=family,
            category=category,
            vCPUs=vcpus,
            memoryGiB=memory,
            networkPerformance=str(network) if network else "",
            baselineBandwidthGbps=str(baseline) if baseline else None,
            burstBandwidthGbps=str(burst) if burst else None,
        )

    return nodes


def group_elasticache_nodes_by_family(
    all_nodes: dict[str, ElastiCacheNodeDetails],
) -> dict[str, ElastiCacheFamilyData]:
    """Group Elasticache nodes by family."""
    families: dict[str, ElastiCacheFamilyData] = {}

    for node_type, details in all_nodes.items():
        family_name = details.family

        if family_name not in families:
            families[family_name] = ElastiCacheFamilyData(
                family=family_name,
                category=details.category,
                nodeTypes=[],
            )

        families[family_name].nodeTypes.append(node_type)

    # Sort node types within each family
    for family in families.values():
        family.nodeTypes.sort()

    return families


# === Serialization ===
def serialize_dataclass(obj) -> dict | None:
    """Serialize a dataclass, handling nested dataclasses."""
    if obj is None:
        return None
    if hasattr(obj, "__dataclass_fields__"):
        result = {}
        for field_name in obj.__dataclass_fields__:
            value = getattr(obj, field_name)
            result[field_name] = serialize_dataclass(value)
        return result
    return obj


def serialize_instance_details(details: InstanceDetails) -> dict:
    """Serialize InstanceDetails to a JSON-compatible dict."""
    return {
        "instanceType": details.instanceType,
        "family": details.family,
        "category": details.category,
        # Flattened familySummary fields
        "hypervisor": details.hypervisor,
        "processorArchitecture": details.processorArchitecture,
        "metalAvailable": details.metalAvailable,
        "dedicatedHosts": details.dedicatedHosts,
        "spot": details.spot,
        "hibernation": details.hibernation,
        "operatingSystems": details.operatingSystems,
        # Flattened performance fields
        "memoryGiB": details.memoryGiB,
        "processor": details.processor,
        "vCPUs": details.vCPUs,
        "cpuCores": details.cpuCores,
        "threadsPerCore": details.threadsPerCore,
        "accelerators": details.accelerators,
        "acceleratorMemory": details.acceleratorMemory,
        # Nested specs
        "network": serialize_dataclass(details.network),
        "ebs": serialize_dataclass(details.ebs),
        "instanceStore": serialize_dataclass(details.instanceStore)
        if details.instanceStore
        else None,
        "security": asdict(details.security),
    }


def serialize_family_data(family: FamilyData) -> dict:
    """Serialize FamilyData to a JSON-compatible dict."""
    return {
        "family": family.family,
        "category": family.category,
        "instanceTypes": family.instanceTypes,
        "hypervisor": family.hypervisor,
        "processorArchitecture": family.processorArchitecture,
        "metalAvailable": family.metalAvailable,
        "dedicatedHosts": family.dedicatedHosts,
        "spot": family.spot,
        "hibernation": family.hibernation,
        "operatingSystems": family.operatingSystems,
    }


def serialize_rds_instance_details(details: RDSInstanceDetails) -> dict:
    """Serialize RDSInstanceDetails to a JSON-compatible dict."""
    return {
        "instanceClass": details.instanceClass,
        "family": details.family,
        "category": details.category,
        "vCPUs": details.vCPUs,
        "memoryGiB": details.memoryGiB,
        "networkBandwidthGbps": details.networkBandwidthGbps,
        "ebsBandwidthMbps": details.ebsBandwidthMbps,
    }


def serialize_rds_family_data(family: RDSFamilyData) -> dict:
    """Serialize RDSFamilyData to a JSON-compatible dict."""
    return {
        "family": family.family,
        "category": family.category,
        "instanceClasses": family.instanceClasses,
    }


def serialize_elasticache_node_details(details: ElastiCacheNodeDetails) -> dict:
    """Serialize ElastiCacheNodeDetails to a JSON-compatible dict."""
    return {
        "nodeType": details.nodeType,
        "family": details.family,
        "category": details.category,
        "vCPUs": details.vCPUs,
        "memoryGiB": details.memoryGiB,
        "networkPerformance": details.networkPerformance,
        "baselineBandwidthGbps": details.baselineBandwidthGbps,
        "burstBandwidthGbps": details.burstBandwidthGbps,
    }


def serialize_elasticache_family_data(family: ElastiCacheFamilyData) -> dict:
    """Serialize ElastiCacheFamilyData to a JSON-compatible dict."""
    return {
        "family": family.family,
        "category": family.category,
        "nodeTypes": family.nodeTypes,
    }


# === File Output ===
def write_json_file(path: Path, data: dict):
    """Write data to a JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def write_ec2_instance_files(instances: dict[str, InstanceDetails], output_dir: Path):
    """Write individual EC2 instance JSON files."""
    instances_dir = output_dir / "instances"
    instances_dir.mkdir(parents=True, exist_ok=True)

    for instance_type, details in instances.items():
        file_path = instances_dir / f"{instance_type}.json"
        write_json_file(file_path, serialize_instance_details(details))


def write_ec2_family_files(families: dict[str, FamilyData], output_dir: Path):
    """Write EC2 family JSON files."""
    families_dir = output_dir / "families"
    families_dir.mkdir(parents=True, exist_ok=True)

    for family_name, family_data in families.items():
        file_path = families_dir / f"{family_name}.json"
        write_json_file(file_path, serialize_family_data(family_data))


def write_ec2_info_file(
    families: dict[str, FamilyData],
    instances: dict[str, InstanceDetails],
    output_dir: Path,
):
    """Write EC2 info manifest file."""
    info = {
        "families": sorted(families.keys()),
        "instances": sorted(instances.keys()),
        "categories": list(EC2_CATEGORIES.keys()),
    }
    write_json_file(output_dir / "info.json", info)


def write_rds_instance_files(instances: dict[str, RDSInstanceDetails], output_dir: Path):
    """Write individual RDS instance JSON files."""
    instances_dir = output_dir / "instances"
    instances_dir.mkdir(parents=True, exist_ok=True)

    for instance_class, details in instances.items():
        file_path = instances_dir / f"{instance_class}.json"
        write_json_file(file_path, serialize_rds_instance_details(details))


def write_rds_family_files(families: dict[str, RDSFamilyData], output_dir: Path):
    """Write RDS family JSON files."""
    families_dir = output_dir / "families"
    families_dir.mkdir(parents=True, exist_ok=True)

    for family_name, family_data in families.items():
        file_path = families_dir / f"{family_name}.json"
        write_json_file(file_path, serialize_rds_family_data(family_data))


def write_rds_info_file(
    families: dict[str, RDSFamilyData],
    instances: dict[str, RDSInstanceDetails],
    output_dir: Path,
):
    """Write RDS info manifest file."""
    info = {
        "families": sorted(families.keys()),
        "instances": sorted(instances.keys()),
        "categories": RDS_CATEGORIES,
    }
    write_json_file(output_dir / "info.json", info)


def write_elasticache_node_files(nodes: dict[str, ElastiCacheNodeDetails], output_dir: Path):
    """Write individual Elasticache node JSON files."""
    nodes_dir = output_dir / "nodes"
    nodes_dir.mkdir(parents=True, exist_ok=True)

    for node_type, details in nodes.items():
        file_path = nodes_dir / f"{node_type}.json"
        write_json_file(file_path, serialize_elasticache_node_details(details))


def write_elasticache_family_files(families: dict[str, ElastiCacheFamilyData], output_dir: Path):
    """Write Elasticache family JSON files."""
    families_dir = output_dir / "families"
    families_dir.mkdir(parents=True, exist_ok=True)

    for family_name, family_data in families.items():
        file_path = families_dir / f"{family_name}.json"
        write_json_file(file_path, serialize_elasticache_family_data(family_data))


def write_elasticache_info_file(
    families: dict[str, ElastiCacheFamilyData],
    nodes: dict[str, ElastiCacheNodeDetails],
    output_dir: Path,
):
    """Write Elasticache info manifest file."""
    info = {
        "families": sorted(families.keys()),
        "nodeTypes": sorted(nodes.keys()),
        "categories": ELASTICACHE_CATEGORIES,
    }
    write_json_file(output_dir / "info.json", info)


# === TypeScript Generation ===
def extract_unique_values(
    instances: dict[str, InstanceDetails], extractor
) -> set[str]:
    """Extract unique string values using an extractor function."""
    values = set()
    for details in instances.values():
        try:
            value = extractor(details)
            if isinstance(value, str) and value:
                values.add(value)
            elif isinstance(value, list):
                for v in value:
                    if isinstance(v, str) and v:
                        values.add(v)
        except (AttributeError, KeyError, TypeError):
            pass
    return values


def generate_union_type(name: str, values: set[str]) -> str:
    """Generate a TypeScript union type."""
    if not values:
        return f"export type {name} = string;\n"
    sorted_values = sorted(values)
    lines = [f'  | "{v}"' for v in sorted_values]
    return f"export type {name} =\n" + "\n".join(lines) + ";\n"


def generate_typescript_types(
    ec2_instances: dict[str, InstanceDetails],
    ec2_families: dict[str, FamilyData],
    rds_instances: dict[str, RDSInstanceDetails],
    rds_families: dict[str, RDSFamilyData],
    elasticache_nodes: dict[str, ElastiCacheNodeDetails],
    elasticache_families: dict[str, ElastiCacheFamilyData],
) -> str:
    """Generate TypeScript type definitions for EC2, RDS, and Elasticache."""
    # Extract unique values for EC2 union types
    ec2_instance_types = set(ec2_instances.keys())
    ec2_family_names = set(ec2_families.keys())
    ec2_categories = set(EC2_CATEGORIES.keys())
    hypervisors = extract_unique_values(
        ec2_instances, lambda d: d.familySummary.hypervisor
    )
    processors = extract_unique_values(ec2_instances, lambda d: d.performance.processor)
    architectures = extract_unique_values(
        ec2_instances, lambda d: d.familySummary.processorArchitecture
    )
    operating_systems = extract_unique_values(
        ec2_instances, lambda d: d.familySummary.operatingSystems
    )
    accelerators = extract_unique_values(
        ec2_instances, lambda d: d.performance.accelerators
    )

    # Extract unique values for RDS union types
    rds_instance_classes = set(rds_instances.keys())
    rds_family_names = set(rds_families.keys())
    rds_categories = set(RDS_CATEGORIES)

    # Extract unique values for Elasticache union types
    elasticache_node_types = set(elasticache_nodes.keys())
    elasticache_family_names = set(elasticache_families.keys())
    elasticache_categories = set(ELASTICACHE_CATEGORIES)

    # Generate TypeScript content
    ts_parts = [
        "// Auto-generated by scripts/generate.py - DO NOT EDIT\n\n",
        "// ============================================================\n",
        "// EC2 Types\n",
        "// ============================================================\n\n",
        generate_union_type("EC2InstanceType", ec2_instance_types),
        "\n",
        generate_union_type("EC2InstanceFamily", ec2_family_names),
        "\n",
        generate_union_type("EC2Category", ec2_categories),
        "\n",
        generate_union_type("EC2Hypervisor", hypervisors),
        "\n",
        generate_union_type("EC2ProcessorArchitecture", architectures),
        "\n",
        generate_union_type("EC2Processor", processors),
        "\n",
        generate_union_type("EC2OperatingSystem", operating_systems),
        "\n",
        generate_union_type("EC2Accelerator", accelerators),
        "\n",
        # EC2 Interfaces
        """// === EC2 Interfaces ===

export interface BandwidthSpec {
  baseline: number | null;
  burst: number | null;
}

export interface VolumeLimitSpec {
  limit: number;
  limitType: string;
}

export interface EC2NetworkSpec {
  bandwidthGbps: BandwidthSpec | string;
  efa: boolean;
  ena: boolean | string;
  enaExpress: boolean;
  networkCards: number;
  maxInterfaces: number;
  ipv4PerInterface: number;
  ipv6: boolean;
}

export interface EC2EBSSpec {
  bandwidthMbps: BandwidthSpec | string;
  throughputMBps: BandwidthSpec | string;
  iops: BandwidthSpec | string;
  nvme: boolean;
  volumeLimit: VolumeLimitSpec | string;
}

export interface EC2InstanceStoreSpec {
  volumes: string;
  storeType: string;
  readIOPS: string;
  writeIOPS: string;
  needsInit: boolean | null;
  trimSupport: boolean | null;
}

export interface EC2SecuritySpec {
  ebsEncryption: boolean;
  instanceStoreEncryption: boolean | string | null;
  encryptionInTransit: boolean;
  amdSEVSNP: boolean;
  nitroTPM: boolean;
  nitroEnclaves: boolean;
}

export interface EC2InstanceDetails {
  instanceType: EC2InstanceType;
  family: EC2InstanceFamily;
  category: EC2Category;
  // Flattened familySummary fields
  hypervisor: EC2Hypervisor;
  processorArchitecture: EC2ProcessorArchitecture;
  metalAvailable: boolean;
  dedicatedHosts: boolean;
  spot: boolean;
  hibernation: boolean;
  operatingSystems: EC2OperatingSystem[];
  // Flattened performance fields
  memoryGiB: number;
  processor: EC2Processor;
  vCPUs: number;
  cpuCores: number;
  threadsPerCore: number;
  accelerators: EC2Accelerator | null;
  acceleratorMemory: string | null;
  // Nested specs
  network: EC2NetworkSpec;
  ebs: EC2EBSSpec;
  instanceStore: EC2InstanceStoreSpec | null;
  security: EC2SecuritySpec;
}

export interface EC2FamilyData {
  family: EC2InstanceFamily;
  category: EC2Category;
  instanceTypes: EC2InstanceType[];
  hypervisor: EC2Hypervisor;
  processorArchitecture: EC2ProcessorArchitecture;
  metalAvailable: boolean;
  dedicatedHosts: boolean;
  spot: boolean;
  hibernation: boolean;
  operatingSystems: EC2OperatingSystem[];
}

export interface EC2Info {
  families: EC2InstanceFamily[];
  instances: EC2InstanceType[];
  categories: EC2Category[];
}

""",
        # RDS Types
        "// ============================================================\n",
        "// RDS Types\n",
        "// ============================================================\n\n",
        generate_union_type("RDSInstanceClass", rds_instance_classes),
        "\n",
        generate_union_type("RDSInstanceFamily", rds_family_names),
        "\n",
        generate_union_type("RDSCategory", rds_categories),
        "\n",
        # RDS Interfaces
        """// === RDS Interfaces ===

export interface RDSInstanceDetails {
  instanceClass: RDSInstanceClass;
  family: RDSInstanceFamily;
  category: RDSCategory;
  vCPUs: number;
  memoryGiB: number;
  networkBandwidthGbps: string;
  ebsBandwidthMbps: string;
}

export interface RDSFamilyData {
  family: RDSInstanceFamily;
  category: RDSCategory;
  instanceClasses: RDSInstanceClass[];
}

export interface RDSInfo {
  families: RDSInstanceFamily[];
  instances: RDSInstanceClass[];
  categories: RDSCategory[];
}
""",
        # Elasticache Types
        "// ============================================================\n",
        "// Elasticache Types\n",
        "// ============================================================\n\n",
        generate_union_type("ElastiCacheNodeType", elasticache_node_types),
        "\n",
        generate_union_type("ElastiCacheFamily", elasticache_family_names),
        "\n",
        generate_union_type("ElastiCacheCategory", elasticache_categories),
        "\n",
        # Elasticache Interfaces
        """// === Elasticache Interfaces ===

export interface ElastiCacheNodeDetails {
  nodeType: ElastiCacheNodeType;
  family: ElastiCacheFamily;
  category: ElastiCacheCategory;
  vCPUs: number | null;
  memoryGiB: number | null;
  networkPerformance: string;
  baselineBandwidthGbps: string | null;
  burstBandwidthGbps: string | null;
}

export interface ElastiCacheFamilyData {
  family: ElastiCacheFamily;
  category: ElastiCacheCategory;
  nodeTypes: ElastiCacheNodeType[];
}

export interface ElastiCacheInfo {
  families: ElastiCacheFamily[];
  nodeTypes: ElastiCacheNodeType[];
  categories: ElastiCacheCategory[];
}
""",
    ]

    return "".join(ts_parts)


def write_typescript_file(content: str, output_path: Path):
    """Write TypeScript type definitions."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write(content)


# === Main ===
def main():
    print("EC2, RDS, and Elasticache Instance Data Generator")
    print("=" * 50)

    # === EC2 Scraping ===
    print("\n[EC2] Scraping instance data...")
    all_ec2_instances: dict[str, InstanceDetails] = {}

    for category, url in EC2_CATEGORIES.items():
        print(f"  Processing {category}...")
        html = fetch_html(url)
        raw_data = parse_category_page(html)
        instances = process_category_data(raw_data, category)
        all_ec2_instances.update(instances)
        print(f"    Found {len(instances)} instance types")

    print(f"  Total EC2 instance types: {len(all_ec2_instances)}")

    # Group EC2 by family
    print("  Grouping by family...")
    ec2_families = group_instances_by_family(all_ec2_instances)
    print(f"  Total EC2 families: {len(ec2_families)}")

    # Write EC2 output files
    print("  Writing EC2 instance files...")
    write_ec2_instance_files(all_ec2_instances, EC2_OUTPUT_DIR)

    print("  Writing EC2 family files...")
    write_ec2_family_files(ec2_families, EC2_OUTPUT_DIR)

    print("  Writing EC2 info file...")
    write_ec2_info_file(ec2_families, all_ec2_instances, EC2_OUTPUT_DIR)

    # === RDS Scraping ===
    print("\n[RDS] Scraping instance class data...")
    html = fetch_html(RDS_URL)
    raw_rds_data = parse_rds_page(html)
    print(f"  Found {len(raw_rds_data)} raw RDS entries")

    all_rds_instances = process_rds_data(raw_rds_data)
    print(f"  Total RDS instance classes: {len(all_rds_instances)}")

    # Group RDS by family
    print("  Grouping by family...")
    rds_families = group_rds_instances_by_family(all_rds_instances)
    print(f"  Total RDS families: {len(rds_families)}")

    # Write RDS output files
    print("  Writing RDS instance files...")
    write_rds_instance_files(all_rds_instances, RDS_OUTPUT_DIR)

    print("  Writing RDS family files...")
    write_rds_family_files(rds_families, RDS_OUTPUT_DIR)

    print("  Writing RDS info file...")
    write_rds_info_file(rds_families, all_rds_instances, RDS_OUTPUT_DIR)

    # === Elasticache Scraping ===
    print("\n[Elasticache] Scraping node type data...")
    html = fetch_html(ELASTICACHE_URL)
    raw_elasticache_data = parse_elasticache_page(html)
    print(f"  Found {len(raw_elasticache_data)} raw Elasticache entries")

    all_elasticache_nodes = process_elasticache_data(raw_elasticache_data)
    print(f"  Total Elasticache node types: {len(all_elasticache_nodes)}")

    # Group Elasticache by family
    print("  Grouping by family...")
    elasticache_families = group_elasticache_nodes_by_family(all_elasticache_nodes)
    print(f"  Total Elasticache families: {len(elasticache_families)}")

    # Write Elasticache output files
    print("  Writing Elasticache node files...")
    write_elasticache_node_files(all_elasticache_nodes, ELASTICACHE_OUTPUT_DIR)

    print("  Writing Elasticache family files...")
    write_elasticache_family_files(elasticache_families, ELASTICACHE_OUTPUT_DIR)

    print("  Writing Elasticache info file...")
    write_elasticache_info_file(elasticache_families, all_elasticache_nodes, ELASTICACHE_OUTPUT_DIR)

    # === TypeScript Generation ===
    print("\n[TypeScript] Generating type definitions...")
    ts_content = generate_typescript_types(
        all_ec2_instances, ec2_families,
        all_rds_instances, rds_families,
        all_elasticache_nodes, elasticache_families,
    )
    write_typescript_file(ts_content, TYPES_OUTPUT)

    # === Summary ===
    print("\n" + "=" * 50)
    print("Done!")
    print("\nEC2:")
    print(f"  - {len(all_ec2_instances)} instance files in {EC2_OUTPUT_DIR / 'instances'}")
    print(f"  - {len(ec2_families)} family files in {EC2_OUTPUT_DIR / 'families'}")
    print(f"  - Info file: {EC2_OUTPUT_DIR / 'info.json'}")
    print("\nRDS:")
    print(f"  - {len(all_rds_instances)} instance files in {RDS_OUTPUT_DIR / 'instances'}")
    print(f"  - {len(rds_families)} family files in {RDS_OUTPUT_DIR / 'families'}")
    print(f"  - Info file: {RDS_OUTPUT_DIR / 'info.json'}")
    print("\nElasticache:")
    print(f"  - {len(all_elasticache_nodes)} node files in {ELASTICACHE_OUTPUT_DIR / 'nodes'}")
    print(f"  - {len(elasticache_families)} family files in {ELASTICACHE_OUTPUT_DIR / 'families'}")
    print(f"  - Info file: {ELASTICACHE_OUTPUT_DIR / 'info.json'}")
    print(f"\nTypeScript types: {TYPES_OUTPUT}")


if __name__ == "__main__":
    main()
