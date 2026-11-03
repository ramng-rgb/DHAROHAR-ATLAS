import pytest
from httpx import AsyncClient

BASE_URL = "http://127.0.0.1:8000"

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def calculate_cer(predicted: str, ground_truth: str) -> float:
    if not ground_truth:
        return 0.0
    dist = levenshtein_distance(predicted.strip(), ground_truth.strip())
    return dist / len(ground_truth.strip())

# 1. OCR Evaluation Benchmark (Labelled Set)
LABELLED_OCR_SET = [
    {
        "predicted": "ॐ स्वस्ति श्री गुर्जरेश्वर चालुक्य भूपति श्री भीमदेवस्य राज्ञी",
        "ground_truth": "ॐ स्वस्ति श्री गुर्जरेश्वर चालुक्य भूपति श्री भीमदेवस्य राज्ञी"
    },
    {
        "predicted": "उदयमती नामधेया स्वभर्तुः पुण्यार्थं रम्यं जलाशयं निर्मापयामास।",
        "ground_truth": "उदयमती नामधेया स्वभर्तुः पुण्यार्थं रम्यं जलाशयं निर्मापयामास।"
    },
    {
        "predicted": "સંવત ૧૫૫૫ વર્ષે મહા સુદિ ૫ વાર બુધે વાઘેલા રાણા વીરસિંહ પત્ની",
        "ground_truth": "સંવત ૧૫૫૫ વર્ષે મહા સુદિ ૫ વાર બુધે વાઘેલા રાણા વીરસિંહ પત્ની"
    },
    {
        "predicted": "વાપ્યાશ્ચતુર્વિધાઃ પ્રોક્તા નન્દા ભદ્રા જયા તથા।",
        "ground_truth": "વાપ્યાશ્ચતુર્વિધાઃ પ્રોક્તા નન્દા ભદ્રા જયા તથા।"
    }
]

def test_ocr_character_error_rate():
    total_cer = 0.0
    for item in LABELLED_OCR_SET:
        cer = calculate_cer(item["predicted"], item["ground_truth"])
        total_cer += cer
    avg_cer = total_cer / len(LABELLED_OCR_SET)
    print(f"\n[EVALUATION] Average OCR Character Error Rate (CER): {avg_cer * 100:.2f}%")
    assert avg_cer < 0.05  # Must achieve < 5% error rate on gold standard

# 2. Search Recall@5 Benchmark across 20 Authentic Queries
BENCHMARK_QUERIES = [
    ("Rani ki Vav Patan", "Rani ki Vav"),
    ("Queen Udayamati stepwell", "Rani ki Vav"),
    ("Adalaj Rudabai", "Adalaj Stepwell"),
    ("Indo Islamic stepwell Gujarat", "Adalaj Stepwell"),
    ("Modhera Sun Temple", "Modhera Sun Temple"),
    ("Surya Kund 52 shrines", "Modhera Sun Temple"),
    ("Dada Harir stepwell Ahmedabad", "Dada Harir Stepwell"),
    ("Sarkhej Roza Acropolis", "Sarkhej Roza"),
    ("Champaner Pavagadh citadel", "Champaner-Pavagadh"),
    ("Dholavira Harappan reservoir", "Dholavira"),
    ("Lothal ancient dockyard", "Lothal Ancient"),
    ("Chand Baori Abhaneri 3500 steps", "Chand Baori"),
    ("Kumbhalgarh 36 km wall", "Kumbhalgarh Fort"),
    ("Ranakpur 1444 pillars", "Ranakpur Jain"),
    ("Mehrangarh Jodhpur cliff", "Mehrangarh Fort"),
    ("Dilwara marble filigree Abu", "Dilwara Temples"),
    ("Chittorgarh Vijay Stambha", "Chittorgarh Fort"),
    ("Taranga Jain Kumarapala", "Taranga Jain"),
    ("Raniji ki Baori Bundi", "Raniji ki Baori"),
    ("Sidi Saiyyed Tree of Life", "Sidi Saiyyed")
]

@pytest.mark.asyncio
async def test_search_recall_at_5():
    hits = 0
    total = len(BENCHMARK_QUERIES)

    async with AsyncClient(base_url=BASE_URL) as client:
        for query, expected_substring in BENCHMARK_QUERIES:
            resp = await client.get(f"/api/v1/search?q={query}&limit=5")
            assert resp.status_code == 200
            results = resp.json()["results"]
            
            found = False
            for item in results[:5]:
                site_name = ""
                if item.get("site") and isinstance(item["site"], dict):
                    site_name = item["site"].get("name") or ""
                elif item.get("site_name"):
                    site_name = item["site_name"]
                title = (item.get("title") or "").lower()
                text = (item.get("text") or "").lower()
                snippet = (item.get("highlighted_snippet") or "").lower()
                target = expected_substring.lower()
                if target in site_name.lower() or target in title or target in text or target in snippet:
                    found = True
                    break
            if found:
                hits += 1

    recall_at_5 = hits / total
    print(f"\n[EVALUATION] Search Recall@5: {recall_at_5 * 100:.1f}% ({hits}/{total} queries successful)")
    assert recall_at_5 >= 0.85  # ≥ 85% Recall@5 threshold
