import json
import os
import struct


def create_box_mesh(min_x, min_y, min_z, max_x, max_y, max_z):
    # 8 vertices
    positions = [
        # Front face
        min_x, min_y, max_z,
        max_x, min_y, max_z,
        max_x, max_y, max_z,
        min_x, max_y, max_z,
        # Back face
        min_x, min_y, min_z,
        min_x, max_y, min_z,
        max_x, max_y, min_z,
        max_x, min_y, min_z,
        # Top face
        min_x, max_y, min_z,
        min_x, max_y, max_z,
        max_x, max_y, max_z,
        max_x, max_y, min_z,
        # Bottom face
        min_x, min_y, min_z,
        max_x, min_y, min_z,
        max_x, min_y, max_z,
        min_x, min_y, max_z,
        # Right face
        max_x, min_y, min_z,
        max_x, max_y, min_z,
        max_x, max_y, max_z,
        max_x, min_y, max_z,
        # Left face
        min_x, min_y, min_z,
        min_x, min_y, max_z,
        min_x, max_y, max_z,
        min_x, max_y, min_z,
    ]
    indices = []
    for face in range(6):
        base = face * 4
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])
    return positions, indices

def generate_stepwell_glb(output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    all_positions = []
    all_indices = []
    index_offset = 0

    def add_box(min_x, min_y, min_z, max_x, max_y, max_z):
        nonlocal index_offset
        pos, ind = create_box_mesh(min_x, min_y, min_z, max_x, max_y, max_z)
        all_positions.extend(pos)
        all_indices.extend([i + index_offset for i in ind])
        index_offset += len(pos) // 3

    # 1. Base Pool / Sump (Lowest Subterranean Tier)
    add_box(-3.0, -2.5, -3.0, 3.0, -2.3, 3.0)
    # Water level
    add_box(-2.8, -2.3, -2.8, 2.8, -2.1, 2.8)

    # 2. Tiered Terraces (Stepped Shaft Tiers)
    # Tier 1
    add_box(-3.5, -1.8, -3.5, 3.5, -1.6, 3.5)
    # Tier 2
    add_box(-4.2, -0.9, -4.2, 4.2, -0.7, 4.2)
    # Ground Rim / Plinth
    add_box(-5.0, 0.0, -5.0, 5.0, 0.2, 5.0)

    # 3. Solanki Classical Pillars (8 Octagonal / Square Pillars around central shaft)
    pillar_coords = [
        (-2.2, -2.2), (0.0, -2.4), (2.2, -2.2),
        (-2.4, 0.0),                (2.4, 0.0),
        (-2.2, 2.2),  (0.0, 2.4),  (2.2, 2.2)
    ]
    for px, pz in pillar_coords:
        # Pillar shaft from tier to roof beam
        add_box(px - 0.18, -2.3, pz - 0.18, px + 0.18, 1.8, pz + 0.18)
        # Carved Bracket Capital (Corbel)
        add_box(px - 0.35, 1.8, pz - 0.35, px + 0.35, 2.05, pz + 0.35)

    # 4. Upper Beams & Torana Archway
    add_box(-2.5, 2.05, -2.5, 2.5, 2.25, -2.2)
    add_box(-2.5, 2.05, 2.2, 2.5, 2.25, 2.5)
    add_box(-2.5, 2.05, -2.5, -2.2, 2.25, 2.5)
    add_box(2.2, 2.05, -2.5, 2.5, 2.25, 2.5)

    # 5. Stepped Roof Chhatri (Pyramidal Pavilion Cap)
    add_box(-2.6, 2.25, -2.6, 2.6, 2.45, 2.6)
    add_box(-2.1, 2.45, -2.1, 2.1, 2.65, 2.1)
    add_box(-1.4, 2.65, -1.4, 1.4, 2.85, 1.4)
    # Finial (Kalasha)
    add_box(-0.25, 2.85, -0.25, 0.25, 3.4, 0.25)

    # 6. Symmetrical Flight of Steps descending into water
    for step in range(8):
        sy = -0.2 * step
        sz = -4.5 + step * 0.45
        add_box(-1.2, sy - 0.2, sz, 1.2, sy, sz + 0.45)

    num_vertices = len(all_positions) // 3
    num_indices = len(all_indices)

    # Binary packing
    # Positions: 3 floats (12 bytes) per vertex
    pos_bytes = struct.pack(f"<{len(all_positions)}f", *all_positions)
    # Indices: unsigned short or unsigned int
    if num_vertices < 65535:
        idx_bytes = struct.pack(f"<{len(all_indices)}H", *all_indices)
        idx_component_type = 5123 # UNSIGNED_SHORT
        idx_byte_length = len(all_indices) * 2
    else:
        idx_bytes = struct.pack(f"<{len(all_indices)}I", *all_indices)
        idx_component_type = 5125 # UNSIGNED_INT
        idx_byte_length = len(all_indices) * 4

    # Pad buffer to 4-byte alignment
    pad_idx = (4 - (idx_byte_length % 4)) % 4
    idx_bytes += b'\x00' * pad_idx
    total_idx_len = len(idx_bytes)

    binary_buffer = idx_bytes + pos_bytes
    total_buf_len = len(binary_buffer)

    min_x = min(all_positions[0::3])
    max_x = max(all_positions[0::3])
    min_y = min(all_positions[1::3])
    max_y = max(all_positions[1::3])
    min_z = min(all_positions[2::3])
    max_z = max(all_positions[2::3])

    gltf_dict = {
        "asset": {
            "version": "2.0",
            "generator": "Dharohar Atlas 3D Digital Twin Generator"
        },
        "scene": 0,
        "scenes": [
            {
                "name": "Rani ki Vav Subterranean Pavilion",
                "nodes": [0]
            }
        ],
        "nodes": [
            {
                "name": "Stepwell_Structure",
                "mesh": 0
            }
        ],
        "materials": [
            {
                "name": "Sandstone_Heritage_PBR",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.84, 0.72, 0.54, 1.0],  # Warm sandstone / Dholpur buff
                    "metallicFactor": 0.05,
                    "roughnessFactor": 0.82
                },
                "doubleSided": True
            }
        ],
        "meshes": [
            {
                "name": "Pavilion_Mesh",
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": 1
                        },
                        "indices": 0,
                        "material": 0,
                        "mode": 4  # TRIANGLES
                    }
                ]
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": idx_component_type,
                "count": num_indices,
                "type": "SCALAR",
                "max": [num_vertices - 1],
                "min": [0]
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,  # FLOAT
                "count": num_vertices,
                "type": "VEC3",
                "max": [max_x, max_y, max_z],
                "min": [min_x, min_y, min_z]
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": idx_byte_length,
                "target": 34963  # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": total_idx_len,
                "byteLength": len(pos_bytes),
                "target": 34962  # ARRAY_BUFFER
            }
        ],
        "buffers": [
            {
                "byteLength": total_buf_len
            }
        ]
    }

    json_str = json.dumps(gltf_dict)
    json_bytes = json_str.encode('utf-8')
    # Pad json bytes to 4-byte alignment
    pad_json = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b' ' * pad_json

    # GLB Header: magic (0x46546C67), version (2), length
    total_glb_len = 12 + 8 + len(json_bytes) + 8 + len(binary_buffer)
    header = struct.pack("<4sII", b"glTF", 2, total_glb_len)

    # Chunk 0: JSON
    chunk0_hdr = struct.pack("<II", len(json_bytes), 0x4E4F534A) # JSON
    # Chunk 1: BIN
    chunk1_hdr = struct.pack("<II", len(binary_buffer), 0x004E4942) # BIN\0

    with open(output_path, "wb") as f:
        f.write(header)
        f.write(chunk0_hdr)
        f.write(json_bytes)
        f.write(chunk1_hdr)
        f.write(binary_buffer)

    print(f"Generated GLB at {output_path} (size: {os.path.getsize(output_path)} bytes, vertices: {num_vertices}, indices: {num_indices})")

if __name__ == "__main__":
    generate_stepwell_glb("apps/web/public/models/stepwell_pavilion.glb")
