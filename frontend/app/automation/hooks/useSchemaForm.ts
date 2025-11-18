"use client";

import { useMemo } from "react";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });

export function useSchemaForm(schema: any) {
  const validate = useMemo(() => ajv.compile(schema), [schema]);

  function validateData(data: any) {
    const ok = validate(data);

    return {
      ok,
      errors: ok ? [] : validate.errors,
    };
  }

  return { validateData };
}
