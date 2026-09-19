import pytest
import json
from app.schemas import ChatRequest, ChatMessage
from app.services.agent_runtime import AgentRuntime
from app.services.llm_service import LLMProvider
from app.core.config import settings

SAMPLE_KB_CHUNKS = [
    {
        "id": "chk-cloud-1",
        "companyId": "tenant-cloudpro",
        "title": "Cloud Platforms",
        "sectionHeader": "Cloud Offerings",
        "content": "Our company provides enterprise cloud consulting and managed services for Amazon Web Services (AWS) and Microsoft Azure."
    },
    {
        "id": "chk-support-1",
        "companyId": "tenant-cloudpro",
        "title": "Customer Support",
        "sectionHeader": "Support Channels & Hours",
        "content": "We provide 24/7 round-the-clock technical support via live chat, email (support@cloudco.com), and dedicated phone lines."
    },
    {
        "id": "chk-refund-1",
        "companyId": "tenant-cloudpro",
        "title": "Refund Policy",
        "sectionHeader": "Money Back Guarantees",
        "content": "Customers can request full refunds on monthly subscriptions within 30 days of initial purchase. No refunds are issued after 30 days."
    },
    {
        "id": "chk-security-1",
        "companyId": "tenant-cloudpro",
        "title": "Security & Compliance",
        "sectionHeader": "Compliance Standards",
        "content": "Our systems are SOC 2 Type II certified, GDPR compliant, and all customer data is encrypted in transit and at rest using AES-256."
    }
]

AGENT_CONFIG = {
    "name": "CloudPro Assistant",
    "tone": "professional",
    "status": "active",
    "modelTier": "sarvam-105b-conversations"
}

@pytest.mark.asyncio
async def test_q1_direct_company_mission():
    """Q1: What does your company do?"""
    req = ChatRequest(message="What does your company do?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    assert res.message and len(res.message) > 10
    msg_lower = res.message.lower()
    assert "aws" in msg_lower or "azure" in msg_lower or "cloud" in msg_lower
    assert res.generation_mode in ["llm", "template_fallback"]
    assert res.generationMode in ["llm", "template_fallback"]

@pytest.mark.asyncio
async def test_q2_specific_platform_offerings():
    """Q2: What cloud platforms do you support?"""
    req = ChatRequest(message="What cloud platforms do you support?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "aws" in msg_lower or "azure" in msg_lower

@pytest.mark.asyncio
async def test_q3_yes_no_nighttime_support():
    """Q3: Can I get support at night?"""
    req = ChatRequest(message="Can I get support at night?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "yes" in msg_lower or "24/7" in msg_lower or "round-the-clock" in msg_lower

@pytest.mark.asyncio
async def test_q4_support_contact_channels():
    """Q4: How can I contact customer support?"""
    req = ChatRequest(message="How can I contact customer support?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "chat" in msg_lower or "email" in msg_lower or "phone" in msg_lower

@pytest.mark.asyncio
async def test_q5_refund_timeframe():
    """Q5: What is your refund policy?"""
    req = ChatRequest(message="What is your refund policy?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "30 days" in msg_lower or "refund" in msg_lower

@pytest.mark.asyncio
async def test_q6_refund_boundary_limit():
    """Q6: Can I get a refund after 45 days?"""
    req = ChatRequest(message="Can I get a refund after 45 days?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "no" in msg_lower or "30 days" in msg_lower or "after 30" in msg_lower

@pytest.mark.asyncio
async def test_q7_security_compliance():
    """Q7: Is your platform SOC 2 certified?"""
    req = ChatRequest(message="Is your platform SOC 2 certified?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "yes" in msg_lower or "soc 2" in msg_lower

@pytest.mark.asyncio
async def test_q8_data_encryption():
    """Q8: How is customer data encrypted?"""
    req = ChatRequest(message="How is customer data encrypted?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "aes-256" in msg_lower or "transit" in msg_lower or "rest" in msg_lower or "encrypt" in msg_lower

@pytest.mark.asyncio
async def test_q9_paraphrased_cloud_services():
    """Q9 (Paraphrased): Tell me about the cloud solutions you offer."""
    req = ChatRequest(message="Tell me about the cloud solutions you offer.")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "aws" in msg_lower or "azure" in msg_lower or "managed" in msg_lower

@pytest.mark.asyncio
async def test_q10_paraphrased_weekend_midnight_support():
    """Q10 (Paraphrased): Is customer assistance available on weekends and midnight?"""
    req = ChatRequest(message="Is customer assistance available on weekends and midnight?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "yes" in msg_lower or "24/7" in msg_lower or "round-the-clock" in msg_lower

@pytest.mark.asyncio
async def test_q11_paraphrased_money_back():
    """Q11 (Paraphrased): How many days do I have to ask for my money back?"""
    req = ChatRequest(message="How many days do I have to ask for my money back?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "30" in msg_lower

@pytest.mark.asyncio
async def test_q12_out_of_domain_ceo():
    """Q12 (Out of Domain): Who is the CEO of the company?"""
    req = ChatRequest(message="Who is the CEO of the company?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    # Must acknowledge lack of information / refusal, not invent a name
    assert "don't have" in msg_lower or "not have" in msg_lower or "not mentioned" in msg_lower or "do not have" in msg_lower or "does not contain" in msg_lower or "not contain" in msg_lower or res.is_refusal

@pytest.mark.asyncio
async def test_q13_out_of_domain_office_address():
    """Q13 (Out of Domain): What is your physical office address?"""
    req = ChatRequest(message="What is your physical office address?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "don't have" in msg_lower or "not have" in msg_lower or "not mentioned" in msg_lower or "do not have" in msg_lower or res.is_refusal

@pytest.mark.asyncio
async def test_q14_out_of_domain_hardware_shipping():
    """Q14 (Out of Domain): Do you sell physical hardware laptops or computer monitors?"""
    req = ChatRequest(message="Do you sell physical hardware laptops or computer monitors?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "don't have" in msg_lower or "not have" in msg_lower or "cloud" in msg_lower or "not" in msg_lower or res.is_refusal

@pytest.mark.asyncio
async def test_q15_multipart_question():
    """Q15 (Multi-part): What cloud services do you provide, and can I get support 24/7?"""
    req = ChatRequest(message="What cloud services do you provide, and can I get support 24/7?")
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert ("aws" in msg_lower or "azure" in msg_lower or "cloud" in msg_lower) and ("24/7" in msg_lower or "support" in msg_lower or "yes" in msg_lower)

@pytest.mark.asyncio
async def test_q16_multiturn_conversational_continuity():
    """Q16 (Multi-turn Contextual Follow-Up): Turn 1 -> Turn 2 with pronoun resolution"""
    history = [
        ChatMessage(role="user", content="Tell me about your cloud services."),
        ChatMessage(role="assistant", content="We provide enterprise cloud services for AWS and Azure.")
    ]
    req = ChatRequest(message="Do they include Microsoft Azure?", history=history)
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "yes" in msg_lower or "azure" in msg_lower

@pytest.mark.asyncio
async def test_q17_multiturn_followup_support():
    """Q17 (Multi-turn Contextual Follow-Up 2): Referencing previous topic for support"""
    history = [
        ChatMessage(role="user", content="I am using your AWS cloud services."),
        ChatMessage(role="assistant", content="Great! We provide full management for AWS."),
        ChatMessage(role="user", content="Can I get help with it at midnight?")
    ]
    req = ChatRequest(message="Can I get help with it at midnight?", history=history)
    res = await AgentRuntime.process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS)
    
    msg_lower = res.message.lower()
    assert "yes" in msg_lower or "24/7" in msg_lower or "support" in msg_lower

@pytest.mark.asyncio
async def test_q18_streaming_token_generation_mode():
    """Q18 (SSE Stream): Verify real token generation and generationMode metadata in start event"""
    req = ChatRequest(message="Can I get support 24/7?")
    events = []
    async for event_str in AgentRuntime.stream_process_message(req, "tenant-cloudpro", AGENT_CONFIG, SAMPLE_KB_CHUNKS):
        if event_str.startswith("data: ") and event_str.strip() != "data: [DONE]":
            try:
                data = json.loads(event_str[6:].strip())
                events.append(data)
            except Exception:
                pass
    
    # Verify start event
    start_events = [e for e in events if e.get("type") == "start"]
    assert len(start_events) == 1
    assert "generationMode" in start_events[0]
    
    # Verify token events
    token_events = [e for e in events if e.get("type") == "token"]
    assert len(token_events) > 0
    full_text = "".join(e.get("token", "") for e in token_events)
    assert len(full_text) > 0
