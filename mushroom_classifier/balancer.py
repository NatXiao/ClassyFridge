import os
import polars as pl

from PIL import Image, ImageOps

base_img_dir = "./mushroom_classifier/FungiTastic/FungiTastic-Mini/train/300p/"
csv_path = "./mushroom_classifier/FungiTastic/metadata/FungiTastic-Mini/FungiTastic-Mini-Train.csv"


df = pl.read_csv(csv_path)
df_poisonous = df.filter(pl.col("poisonous") == 1)


augmented_rows = []
for row in df_poisonous.iter_rows(named=True):

    print(f"Loading : {int(len(augmented_rows) * 100 / (df_poisonous.height * 8))}%", end="\r")

    img_path = os.path.join(base_img_dir, row["filename"])

    with Image.open(img_path) as img:

        root, ext = os.path.splitext(row["filename"])

        # Rotation
        for i in range(1, 5):

            angle = i * 90

            rotated_img = img.rotate(angle)

            new_filename = f"r{angle}_{root}{ext}"
            new_path = os.path.join(base_img_dir, new_filename)

            rotated_img.save(new_path)

            new_row = row.copy()
            new_row["filename"] = new_filename


            augmented_rows.append(new_row)


        # Flip
        rotated_img = ImageOps.flip(img)

        new_filename = f"r_fliop_{root}{ext}"
        new_path = os.path.join(base_img_dir, new_filename)

        rotated_img.save(new_path)

        new_row = row.copy()
        new_row["filename"] = new_filename

        augmented_rows.append(new_row)

        # Mirror
        rotated_img = ImageOps.mirror(img)

        new_filename = f"r_mirror_{root}{ext}"
        new_path = os.path.join(base_img_dir, new_filename)

        rotated_img.save(new_path)

        new_row = row.copy()
        new_row["filename"] = new_filename

        augmented_rows.append(new_row)
            

df_augmented = pl.DataFrame(augmented_rows, schema=df.schema)
df_final = pl.concat([df, df_augmented])

output_csv_path = csv_path.replace(".csv", "_augmented.csv")
df_final.write_csv(output_csv_path)






