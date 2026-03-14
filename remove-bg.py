from PIL import Image

# Open the logo
img = Image.open('public/logo_vibeclean.png')
img = img.convert('RGBA')

# Make white background transparent
datas = img.getdata()
newData = []

for item in datas:
    # If pixel is white or very light, make it transparent
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save('public/logo_vibeclean_nobg.png', 'PNG')
print("Background removed successfully!")
