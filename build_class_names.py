import json

from datasets import load_dataset

ds = load_dataset("ibrahimdaud/raw-food-recognition", split="train")
ds = ds.select_columns(["label", "label_id"])  

id_to_name = {}
for name, idx in zip(ds["label"], ds["label_id"]):
    if idx in id_to_name and id_to_name[idx] != name:
        raise ValueError(f"id {idx} maps to both {id_to_name[idx]!r} and {name!r}")
    id_to_name[idx] = name

ids = sorted(id_to_name)
if ids != list(range(len(ids))):
    raise ValueError(f"label_ids are not contiguous 0..N-1: {ids}")

class_names = [id_to_name[i] for i in ids]
print(f"{len(class_names)} classes")
print(class_names)

with open("class_names.json", "w", encoding="utf-8") as f:
    json.dump(class_names, f, ensure_ascii=False, indent=2)