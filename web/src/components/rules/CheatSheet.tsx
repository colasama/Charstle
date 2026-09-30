import { actionDocs } from '../../mock/data';

const phaseBadge = {
  request: 'badge-accent',
  dial: 'badge-info',
  response: 'badge-success',
} as const;

const phaseText = { request: '请求', dial: '连接', response: '响应' };

export function CheatSheet() {
  return (
    <div className="scroll grow">
      <div className="cheatsheet">
        <div className="section-title">语法</div>
        <div className="syntax-card">
          <div className="c"># 注释</div>
          <div>
            <span className="p">pattern</span> <span className="k">action://</span>
            <span className="r">value</span> <span className="k">…</span> <span className="f">key=val</span>
          </div>
          <div className="c" style={{ marginTop: 6 }}># pattern</div>
          <div>www.a.com · *.a.com · a.com/api/</div>
          <div>/^https:\/\/a\.com\/(\d+)$/</div>
          <div className="c" style={{ marginTop: 6 }}># value</div>
          <div>
            <span className="r">{'{key}'}</span> 引用 Values · URL · 文件路径
          </div>
          <div className="c" style={{ marginTop: 6 }}># 过滤条件</div>
          <div>
            <span className="f">method=POST clientIp=192.168.1.42</span>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 8 }}>
          动作
        </div>
        {/* TODO: 点击插入到编辑器光标处 */}
        {actionDocs.map((d) => (
          <div key={d.kind} className="cheat-item" title="点击插入">
            <div className="cheat-item-head">
              <span className="cheat-kind">{d.kind}</span>
              <span className={`badge ${phaseBadge[d.phase]}`}>{phaseText[d.phase]}</span>
            </div>
            <div className="cheat-desc">{d.desc}</div>
            <div className="cheat-example">{d.example}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
