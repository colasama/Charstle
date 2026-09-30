/**
 * 规则文本的语法高亮（仅着色，不做校验；校验由后端 /api/rules/validate 完成）
 *
 *   # 注释
 *   <pattern>  <action>://<value>  [action2://value2 ...]  [key=value 过滤条件]
 *
 * pattern:  域名 / 通配(*) / 前缀路径 / /正则/
 * value:    {valueKey} 引用 Values；也可以是 URL、文件路径、数字
 */
import { StreamLanguage, type StringStream } from '@codemirror/language';

interface State {
  /** 当前行是否已经读过 pattern */
  seenPattern: boolean;
}

const URL_ACTION = /^https?:\/\/\S+/;
const ACTION = /^[a-zA-Z]+:\/\/\S*/;
const REGEX = /^\/(?:\\.|[^/\s])+\/[a-z]*/;
const FILTER = /^[a-zA-Z]+=\S+/;

export const rulesLanguage = StreamLanguage.define<State>({
  name: 'charstle-rules',
  startState: () => ({ seenPattern: false }),
  token(stream: StringStream, state: State) {
    if (stream.sol()) state.seenPattern = false;
    if (stream.eatSpace()) return null;

    if (stream.peek() === '#') {
      stream.skipToEnd();
      return 'comment';
    }

    if (!state.seenPattern) {
      state.seenPattern = true;
      if (stream.match(REGEX)) return 'regexp';
      stream.match(/^\S+/);
      return 'variableName';
    }

    // action 值中的 {ref}：先吃掉 "kind://"，再在下一轮识别 {ref}
    if (stream.match(/^[a-zA-Z]+:\/\/(?=\{)/)) return 'keyword';
    if (stream.match(/^\{[^}\s]+\}/)) return 'string.special';
    if (stream.match(URL_ACTION)) return 'link';
    if (stream.match(ACTION)) {
      return 'keyword';
    }
    if (stream.match(FILTER)) return 'propertyName';

    stream.match(/^\S+/);
    return 'invalid';
  },
  languageData: {
    commentTokens: { line: '#' },
  },
});
