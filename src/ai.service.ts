import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export type AiResult = { summary: string; category: string; reply: string };

@Injectable()
export class AiService {
  async analyze(content: string, equipmentName?: string): Promise<AiResult> {
    const key = process.env.GPT_API_KEY;
    if (!key) throw new ServiceUnavailableException('AI 설정이 아직 안 되어 있어요. 관리자에게 알려 주세요.');

    const system =
      '너는 공유 작업실 관리자를 돕는 비서야. 회원의 문의를 읽고 JSON으로만 답해. ' +
      '키: summary(한국어 두 문장 이내 요약), category("고장" | "사용법" | "기타" 중 하나), ' +
      'reply(회원에게 보낼 정중하고 짧은 한국어 답장 초안, 모르는 사실은 지어내지 말고 확인 후 안내하겠다고 쓸 것).';
    const user = `장비: ${equipmentName || '미지정'}\n문의 내용: ${content}`;

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.GPT_MODEL || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          temperature: 0.3,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
    } catch (e: any) {
      console.error('OpenAI 연결 실패', e?.cause || e);
      throw new BadGatewayException(`AI 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요. (${e?.cause?.code || e?.message})`);
    }
    if (!res.ok) {
      const body: any = await res.json().catch(() => null);
      const reason = body?.error?.code || body?.error?.type || 'unknown';
      console.error('OpenAI 오류', res.status, JSON.stringify(body));
      throw new BadGatewayException(`AI가 지금 답하지 못했어요. 잠시 뒤 다시 시도해 주세요. (OpenAI ${res.status}: ${reason})`);
    }
    const data: any = await res.json();
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      const category = ['고장', '사용법', '기타'].includes(parsed.category) ? parsed.category : '기타';
      return { summary: String(parsed.summary || ''), category, reply: String(parsed.reply || '') };
    } catch {
      throw new BadGatewayException('AI 답변을 읽지 못했어요. 다시 시도해 주세요.');
    }
  }
}
