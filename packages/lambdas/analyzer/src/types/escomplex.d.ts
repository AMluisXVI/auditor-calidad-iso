declare module 'typhonjs-escomplex' {
  interface FunctionReport {
    name: string;
    cyclomatic: number;
    sloc: { logical: number; physical: number };
    paramCount: number;
    lineStart: number;
    lineEnd: number;
  }

  interface ModuleReport {
    aggregate: {
      cyclomatic: number;
      sloc: { logical: number; physical: number };
    };
    methods: FunctionReport[];
    classes: unknown[];
    errors: unknown[];
    maintainability: number;
  }

  interface ESComplex {
    analyzeModule(source: string, options?: object): ModuleReport;
  }

  const escomplex: ESComplex;
  export default escomplex;
}
