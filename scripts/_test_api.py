import google.generativeai as genai, os
genai.configure(api_key=os.environ['GEMINI_API_KEY'])
model = genai.GenerativeModel('gemini-2.0-flash')
schema = {'type':'array','items':{'type':'object','properties':{'word':{'type':'string'},'example_vi':{'type':'string'}}}}
resp = model.generate_content(
    'Translate to Vietnamese. Return JSON array:\n[{"word":"assess","example":"It is hard to assess suitability."}]',
    generation_config=genai.GenerationConfig(response_mime_type='application/json',response_schema=schema,temperature=0.1))
print(resp.text)
