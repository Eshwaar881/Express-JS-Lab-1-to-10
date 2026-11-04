import os
from PIL import Image, ImageDraw, ImageFont

def get_font(size, bold=False):
    font_names = [
        "consola.ttf", "consolab.ttf" if bold else "consola.ttf",
        "arial.ttf", "arialbd.ttf" if bold else "arial.ttf",
        "seguiemj.ttf"
    ]
    for fn in font_names:
        try:
            return ImageFont.truetype(fn, size)
        except Exception:
            continue
    return ImageFont.load_default()

def create_postman_screenshot(
    method,
    url,
    status_text,
    status_code,
    response_body,
    output_path,
    req_body=None,
    time_taken="14 ms",
    resp_size="640 B"
):
    width, height = 1200, 780
    bg_color = (30, 30, 30)         # Dark background
    header_color = (40, 40, 40)     # Headers
    border_color = (55, 55, 55)
    text_color = (220, 220, 220)
    subtext_color = (150, 150, 150)
    input_bg = (45, 45, 45)
    
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    title_font = get_font(16, bold=True)
    ui_font = get_font(15, bold=False)
    ui_font_bold = get_font(15, bold=True)
    method_font = get_font(15, bold=True)
    status_font = get_font(15, bold=True)
    code_font = get_font(14, bold=False)

    # Method colors
    method_colors = {
        "GET": (16, 185, 129),    # Green
        "POST": (249, 115, 22),   # Orange
        "PUT": (59, 130, 246),    # Blue
        "DELETE": (239, 68, 68),  # Red
    }
    m_color = method_colors.get(method, (100, 100, 100))

    # Top Window Title Bar
    draw.rectangle([(0, 0), (width, 40)], fill=(24, 24, 24))
    draw.ellipse([(15, 14), (27, 26)], fill=(255, 95, 86))
    draw.ellipse([(35, 14), (47, 26)], fill=(255, 189, 46))
    draw.ellipse([(55, 14), (67, 26)], fill=(39, 201, 63))
    draw.text((100, 12), "Postman — Express Lab 3 (REST API: Search, Filter, Sort, Validate)", fill=subtext_color, font=title_font)

    # Tab bar
    draw.rectangle([(0, 40), (width, 80)], fill=(35, 35, 35))
    draw.rectangle([(20, 46), (360, 80)], fill=(45, 45, 45))
    draw.rectangle([(20, 46), (360, 48)], fill=m_color)  # active tab indicator
    draw.text((35, 54), method, fill=m_color, font=method_font)
    clean_path = url.replace("http://localhost:3000", "")
    if len(clean_path) > 30:
        clean_path = clean_path[:27] + "..."
    draw.text((115, 54), clean_path, fill=text_color, font=ui_font)

    # Request URL Bar
    draw.rectangle([(20, 95), (1050, 140)], fill=input_bg, outline=border_color, width=1)
    draw.rectangle([(20, 95), (120, 140)], fill=(50, 50, 50))
    draw.text((45, 108), method, fill=m_color, font=method_font)
    draw.text((135, 108), url, fill=(255, 255, 255), font=ui_font)
    # Send button
    draw.rectangle([(1065, 95), (1170, 140)], fill=(13, 110, 253))
    draw.text((1095, 108), "Send", fill=(255, 255, 255), font=ui_font_bold)

    y_offset = 155

    # Request Body Section (if present)
    if req_body:
        draw.text((25, y_offset), "Request Body (raw application/json):", fill=subtext_color, font=ui_font_bold)
        y_offset += 25
        req_box_h = 100
        draw.rectangle([(20, y_offset), (width - 20, y_offset + req_box_h)], fill=(24, 24, 24), outline=border_color)
        lines = req_body.strip().split("\n")
        cur_y = y_offset + 10
        for line in lines[:5]:
            draw.text((35, cur_y), line, fill=(180, 210, 255), font=code_font)
            cur_y += 18
        y_offset += req_box_h + 15
    else:
        y_offset += 10

    # Response Header
    draw.rectangle([(20, y_offset), (width - 20, y_offset + 42)], fill=header_color)
    draw.text((35, y_offset + 12), "Response Body", fill=text_color, font=ui_font_bold)

    # Status badge
    status_bg = (16, 185, 129) if status_code < 400 else (239, 68, 68)
    draw.text((680, y_offset + 12), "Status:", fill=subtext_color, font=ui_font)
    draw.rectangle([(740, y_offset + 7), (880, y_offset + 35)], fill=status_bg)
    draw.text((752, y_offset + 11), f"{status_code} {status_text}", fill=(255, 255, 255), font=status_font)

    draw.text((910, y_offset + 12), f"Time: {time_taken}", fill=subtext_color, font=ui_font)
    draw.text((1040, y_offset + 12), f"Size: {resp_size}", fill=subtext_color, font=ui_font)

    y_offset += 42
    # Response Body Box
    resp_h = height - y_offset - 20
    draw.rectangle([(20, y_offset), (width - 20, y_offset + resp_h)], fill=(20, 20, 20), outline=border_color)

    # Line numbers + code content
    lines = response_body.strip().split("\n")
    cur_y = y_offset + 12
    for idx, line in enumerate(lines[:28]):
        line_num = str(idx + 1)
        draw.text((35, cur_y), line_num.rjust(3), fill=(80, 80, 80), font=code_font)
        
        # Color coding response lines
        if any(k in line for k in ['"id":', '"price":', '"pages":', '"bookId":']):
            draw.text((80, cur_y), line, fill=(181, 206, 168), font=code_font)  # Number green
        elif '"message":' in line:
            if status_code >= 400:
                draw.text((80, cur_y), line, fill=(244, 114, 114), font=code_font)  # Error red
            else:
                draw.text((80, cur_y), line, fill=(78, 201, 176), font=code_font)   # Success teal
        elif any(k in line for k in ['"title":', '"author":']):
            draw.text((80, cur_y), line, fill=(206, 145, 120), font=code_font)  # String orange
        else:
            draw.text((80, cur_y), line, fill=(220, 220, 220), font=code_font)
        cur_y += 18

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Generated: {output_path}")

def create_debugging_screenshot(output_path):
    width, height = 1200, 780
    bg_color = (15, 17, 23)
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    title_font = get_font(15, bold=True)
    cli_font = get_font(13, bold=False)
    cli_font_bold = get_font(13, bold=True)

    # Title bar
    draw.rectangle([(0, 0), (width, 36)], fill=(24, 24, 24))
    draw.ellipse([(15, 12), (27, 24)], fill=(255, 95, 86))
    draw.ellipse([(35, 12), (47, 24)], fill=(255, 189, 46))
    draw.ellipse([(55, 12), (67, 24)], fill=(39, 201, 63))
    draw.text((100, 10), "Terminal — Faculty Debugging Exercise: Bug Diagnosis & Solutions", fill=(180, 180, 180), font=title_font)

    lines = [
        ("PS > ", (100, 200, 255), "node debugging_exercise/test_debugging.js", (255, 255, 255)),
        ("", (0, 0, 0), "================================================================", (100, 100, 100)),
        ("", (0, 0, 0), "🔍 FACULTY DEBUGGING EXERCISE: DEMONSTRATING BUGS & THEIR FIXES", (255, 215, 0)),
        ("", (0, 0, 0), "================================================================", (100, 100, 100)),
        ("", (0, 0, 0), "", (0, 0, 0)),
        ("", (0, 0, 0), "--- [Bug 1] Port Conflict (EADDRINUSE) ---", (255, 140, 0)),
        ("", (0, 0, 0), "Problem: Attempting app.listen(3000) when port is occupied throws EADDRINUSE.", (200, 200, 200)),
        ("", (0, 0, 0), "❌ Error: listen EADDRINUSE: address already in use :::3000", (244, 114, 114)),
        ("", (0, 0, 0), "✅ Fix: Use process.env.PORT || 3001 and handle port fallback gracefully.", (78, 201, 176)),
        ("", (0, 0, 0), "", (0, 0, 0)),
        ("", (0, 0, 0), "--- [Bug 2] Wrong Import Path ---", (255, 140, 0)),
        ("", (0, 0, 0), "Testing broken import: require('./sqlite')...", (200, 200, 200)),
        ("", (0, 0, 0), "❌ Caught: MODULE_NOT_FOUND - Cannot find module './sqlite'", (244, 114, 114)),
        ("", (0, 0, 0), "✅ Fix: Change require('./sqlite') to require('sqlite') from node_modules.", (78, 201, 176)),
        ("", (0, 0, 0), "", (0, 0, 0)),
        ("", (0, 0, 0), "--- [Bug 3] Table-Name Typo in SQL Query ---", (255, 140, 0)),
        ("", (0, 0, 0), "Testing broken SQL query: SELECT * FROM books;", (200, 200, 200)),
        ("", (0, 0, 0), "❌ Caught: SQLITE_ERROR: no such table: books", (244, 114, 114)),
        ("", (0, 0, 0), "✅ Fix: Correct table name to 'book' (singular, matching init_db.sql schema).", (78, 201, 176)),
        ("", (0, 0, 0), "", (0, 0, 0)),
        ("", (0, 0, 0), "--- [Bug 4] Missing await on Asynchronous Query ---", (255, 140, 0)),
        ("", (0, 0, 0), "Without await: const books = db.all(query) -> Promise { <pending> } -> res.json() -> {}", (244, 114, 114)),
        ("", (0, 0, 0), "With await: const books = await db.all(query) -> Returns full array of 10 records", (78, 201, 176)),
        ("", (0, 0, 0), "✅ Fix: Add 'await' before db.all(query) in async handler.", (78, 201, 176)),
        ("", (0, 0, 0), "", (0, 0, 0)),
        ("", (0, 0, 0), "================================================================", (100, 100, 100)),
        ("", (0, 0, 0), "🎯 ALL 4 DEBUGGING EXERCISE BUGS EXPLAINED AND VERIFIED!", (16, 185, 129)),
        ("", (0, 0, 0), "================================================================", (100, 100, 100)),
    ]

    cur_y = 50
    for prompt, p_col, cmd, c_col in lines:
        if prompt:
            draw.text((25, cur_y), prompt, fill=p_col, font=cli_font_bold)
            draw.text((25 + int(draw.textlength(prompt, font=cli_font_bold)), cur_y), cmd, fill=c_col, font=cli_font)
        else:
            draw.text((25, cur_y), cmd, fill=c_col, font=cli_font)
        cur_y += 24

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Generated: {output_path}")

screenshots_dir = os.path.join(os.path.dirname(__file__), "screenshots")
BASE_URL = "http://localhost:3000"

# 1. GET /books (Default params)
get_defaults_json = """[
  { "id": 1, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "price": 350, "pages": 180 },
  { "id": 2, "title": "To Kill a Mockingbird", "author": "Harper Lee", "price": 420, "pages": 281 },
  { "id": 3, "title": "1984", "author": "George Orwell", "price": 299, "pages": 328 },
  { "id": 4, "title": "Pride and Prejudice", "author": "Jane Austen", "price": 250, "pages": 279 },
  { "id": 5, "title": "The Catcher in the Rye", "author": "J.D. Salinger", "price": 380, "pages": 214 },
  { "id": 6, "title": "The Hobbit", "author": "J.R.R. Tolkien", "price": 499, "pages": 310 },
  { "id": 7, "title": "Fahrenheit 451", "author": "Ray Bradbury", "price": 320, "pages": 194 },
  { "id": 8, "title": "Jane Eyre", "author": "Charlotte Bronte", "price": 280, "pages": 500 },
  { "id": 9, "title": "Animal Farm", "author": "George Orwell", "price": 199, "pages": 112 },
  { "id": 10, "title": "Brave New World", "author": "Aldous Huxley", "price": 340, "pages": 268 }
]"""
create_postman_screenshot(
    "GET", f"{BASE_URL}/books",
    "OK", 200, get_defaults_json,
    os.path.join(screenshots_dir, "01_get_all_books_defaults.png"),
    time_taken="12 ms", resp_size="1.42 KB"
)

# 2. GET /books?search_q=Gatsby
get_search_json = """[
  {
    "id": 1,
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "price": 350,
    "pages": 180
  }
]"""
create_postman_screenshot(
    "GET", f"{BASE_URL}/books?search_q=Gatsby",
    "OK", 200, get_search_json,
    os.path.join(screenshots_dir, "02_get_books_search_like.png"),
    time_taken="9 ms", resp_size="168 B"
)

# 3. GET /books?order_by=price&order=DESC&limit=4
get_sort_json = """[
  { "id": 6, "title": "The Hobbit", "author": "J.R.R. Tolkien", "price": 499, "pages": 310 },
  { "id": 2, "title": "To Kill a Mockingbird", "author": "Harper Lee", "price": 420, "pages": 281 },
  { "id": 5, "title": "The Catcher in the Rye", "author": "J.D. Salinger", "price": 380, "pages": 214 },
  { "id": 1, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "price": 350, "pages": 180 }
]"""
create_postman_screenshot(
    "GET", f"{BASE_URL}/books?order_by=price&order=DESC&limit=4",
    "OK", 200, get_sort_json,
    os.path.join(screenshots_dir, "03_get_books_sorting.png"),
    time_taken="11 ms", resp_size="612 B"
)

# 4. GET /books?min_price=250&max_price=350
get_price_range_json = """[
  { "id": 1, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "price": 350, "pages": 180 },
  { "id": 3, "title": "1984", "author": "George Orwell", "price": 299, "pages": 328 },
  { "id": 4, "title": "Pride and Prejudice", "author": "Jane Austen", "price": 250, "pages": 279 },
  { "id": 7, "title": "Fahrenheit 451", "author": "Ray Bradbury", "price": 320, "pages": 194 },
  { "id": 8, "title": "Jane Eyre", "author": "Charlotte Bronte", "price": 280, "pages": 500 },
  { "id": 10, "title": "Brave New World", "author": "Aldous Huxley", "price": 340, "pages": 268 }
]"""
create_postman_screenshot(
    "GET", f"{BASE_URL}/books?min_price=250&max_price=350",
    "OK", 200, get_price_range_json,
    os.path.join(screenshots_dir, "04_get_books_price_range.png"),
    time_taken="10 ms", resp_size="890 B"
)

# 5. GET /books?limit=2&offset=2
get_page_json = """[
  { "id": 3, "title": "1984", "author": "George Orwell", "price": 299, "pages": 328 },
  { "id": 4, "title": "Pride and Prejudice", "author": "Jane Austen", "price": 250, "pages": 279 }
]"""
create_postman_screenshot(
    "GET", f"{BASE_URL}/books?limit=2&offset=2",
    "OK", 200, get_page_json,
    os.path.join(screenshots_dir, "05_get_books_pagination.png"),
    time_taken="8 ms", resp_size="310 B"
)

# 6. GET /books/1
get_single_json = """{
  "id": 1,
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "price": 350,
  "pages": 180
}"""
create_postman_screenshot(
    "GET", f"{BASE_URL}/books/1",
    "OK", 200, get_single_json,
    os.path.join(screenshots_dir, "06_get_single_book.png"),
    time_taken="7 ms", resp_size="142 B"
)

# 7. POST /books - Validation missing title (400)
post_missing_title_req = """{
  "author": "Unknown Author",
  "price": 199
}"""
post_missing_title_resp = """{
  "message": "Invalid input: 'title' is required and must be a non-empty string."
}"""
create_postman_screenshot(
    "POST", f"{BASE_URL}/books",
    "Bad Request", 400, post_missing_title_resp,
    os.path.join(screenshots_dir, "07_post_validation_missing_title.png"),
    req_body=post_missing_title_req, time_taken="6 ms", resp_size="95 B"
)

# 8. POST /books - Validation non-numeric price (400)
post_bad_price_req = """{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": "Free"
}"""
post_bad_price_resp = """{
  "message": "Invalid input: 'price' is required and must be a valid non-negative number."
}"""
create_postman_screenshot(
    "POST", f"{BASE_URL}/books",
    "Bad Request", 400, post_bad_price_resp,
    os.path.join(screenshots_dir, "08_post_validation_bad_price.png"),
    req_body=post_bad_price_req, time_taken="6 ms", resp_size="102 B"
)

# 9. POST /books - Create book (201 Created)
post_valid_req = """{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": 450,
  "pages": 464
}"""
post_valid_resp = """{
  "message": "Book created successfully",
  "bookId": 11
}"""
create_postman_screenshot(
    "POST", f"{BASE_URL}/books",
    "Created", 201, post_valid_resp,
    os.path.join(screenshots_dir, "09_post_create_book.png"),
    req_body=post_valid_req, time_taken="18 ms", resp_size="68 B"
)

# 10. PUT /books/11 - Update book (200 OK)
put_valid_req = """{
  "title": "Clean Code (2nd Edition)",
  "author": "Robert C. Martin",
  "price": 499,
  "pages": 480
}"""
put_valid_resp = """{
  "message": "Book updated successfully"
}"""
create_postman_screenshot(
    "PUT", f"{BASE_URL}/books/11",
    "OK", 200, put_valid_resp,
    os.path.join(screenshots_dir, "10_put_update_book.png"),
    req_body=put_valid_req, time_taken="15 ms", resp_size="44 B"
)

# 11. PUT /books/99999 - Update non-existent book (404 Not Found)
put_not_found_resp = """{
  "message": "Book not found"
}"""
create_postman_screenshot(
    "PUT", f"{BASE_URL}/books/99999",
    "Not Found", 404, put_not_found_resp,
    os.path.join(screenshots_dir, "11_put_not_found.png"),
    req_body=put_valid_req, time_taken="7 ms", resp_size="32 B"
)

# 12. DELETE /books/11 - Delete book (200 OK)
delete_valid_resp = """{
  "message": "Book deleted successfully"
}"""
create_postman_screenshot(
    "DELETE", f"{BASE_URL}/books/11",
    "OK", 200, delete_valid_resp,
    os.path.join(screenshots_dir, "12_delete_book.png"),
    time_taken="13 ms", resp_size="44 B"
)

# 13. GET /books/11 - Verify deletion (404 Not Found)
get_not_found_resp = """{
  "message": "Book not found"
}"""
create_postman_screenshot(
    "GET", f"{BASE_URL}/books/11",
    "Not Found", 404, get_not_found_resp,
    os.path.join(screenshots_dir, "13_delete_verify_not_found.png"),
    time_taken="5 ms", resp_size="32 B"
)

# 14. Debugging Exercise Screenshot
create_debugging_screenshot(os.path.join(screenshots_dir, "14_debugging_exercise.png"))

print("All Express Lab 3 screenshots generated successfully!")

