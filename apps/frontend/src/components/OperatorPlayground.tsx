// "use client";

// import { useMemo, useState } from "react";
// import {
//   Badge,
//   Box,
//   Button,
//   Container,
//   Divider,
//   Flex,
//   HStack,
//   Input,
//   Select,
//   Stack,
//   Text,
// } from "@chakra-ui/react";
// import {
//   ApplyStringOrNumericBinaryOperator,
//   OPERATORS,
//   type Operator,
// } from "@/lib/ecma262/Addition";
// import { TRACE_TYPE_COLORS, traceTypeOf } from "@/lib/isLooselyEqualTrace";

// type ValueType = "string" | "number" | "boolean" | "bigint" | "null" | "undefined" | "json";
// type TypedInput = { raw: string; type: ValueType };

// const defaultLeft: TypedInput = { raw: "1", type: "number" };
// const defaultRight: TypedInput = { raw: "2", type: "number" };

// function coerceValue(input: TypedInput): { value?: unknown; error?: string } {
//   const text = input.raw.trim();
//   switch (input.type) {
//     case "string":
//       return { value: text };
//     case "number": {
//       const num = Number(text);
//       if (Number.isNaN(num)) return { error: "Invalid number" };
//       return { value: num };
//     }
//     case "boolean": {
//       if (text.toLowerCase() === "true") return { value: true };
//       if (text.toLowerCase() === "false") return { value: false };
//       return { error: "Use true or false" };
//     }
//     case "bigint": {
//       try {
//         return { value: BigInt(text) };
//       } catch {
//         return { error: "Invalid bigint" };
//       }
//     }
//     case "null":
//       return { value: null };
//     case "undefined":
//       return { value: undefined };
//     case "json": {
//       try {
//         return { value: JSON.parse(text) };
//       } catch {
//         return { error: "Invalid JSON" };
//       }
//     }
//     default:
//       return { value: text };
//   }
// }

// function ResultBadge({ label, jsType }: { label: string; jsType: ReturnType<typeof traceTypeOf> }) {
//   const color = TRACE_TYPE_COLORS[jsType] || "gray.300";
//   return (
//     <Badge color={color} borderColor={color} borderWidth="1px" bg="transparent" textTransform="none">
//       {label}: {jsType}
//     </Badge>
//   );
// }

// function ValuePreview({ value }: { value: unknown }) {
//   if (typeof value === "string") return <Text>"{value}"</Text>;
//   if (typeof value === "bigint") return <Text>{String(value)}n</Text>;
//   if (typeof value === "symbol") return <Text>{value.toString()}</Text>;
//   if (value === null) return <Text>null</Text>;
//   if (value === undefined) return <Text>undefined</Text>;
//   if (typeof value === "object") return <Text>{JSON.stringify(value)}</Text>;
//   return <Text>{String(value)}</Text>;
// }

// type InputProps = {
//   label: string;
//   state: TypedInput;
//   onChange: (next: TypedInput) => void;
//   error?: string;
// };

// function InputWithType({ label, state, onChange, error }: InputProps) {
//   return (
//     <Stack gap={1} flex={1}>
//       <Text fontSize="sm" color="gray.500">
//         {label}
//       </Text>
//       <Flex gap={2}>
//         <Input value={state.raw} onChange={(e) => onChange({ ...state, raw: e.target.value })} />
//         <Select value={state.type} onChange={(e) => onChange({ ...state, type: e.target.value as ValueType })} w="160px">
//           <option value="string">string</option>
//           <option value="number">number</option>
//           <option value="boolean">boolean</option>
//           <option value="bigint">bigint</option>
//           <option value="null">null</option>
//           <option value="undefined">undefined</option>
//           <option value="json">JSON/object</option>
//         </Select>
//       </Flex>
//       {error && (
//         <Text color="red.400" fontSize="xs">
//           {error}
//         </Text>
//       )}
//     </Stack>
//   );
// }

// export function OperatorPlayground() {
//   const [left, setLeft] = useState<TypedInput>(defaultLeft);
//   const [right, setRight] = useState<TypedInput>(defaultRight);
//   const [op, setOp] = useState<Operator>("+");

//   const parsedLeft = useMemo(() => coerceValue(left), [left]);
//   const parsedRight = useMemo(() => coerceValue(right), [right]);

//   const evaluation = useMemo(() => {
//     if (parsedLeft.error || parsedRight.error) {
//       return { error: parsedLeft.error || parsedRight.error };
//     }
//     try {
//       const value = ApplyStringOrNumericBinaryOperator(parsedLeft.value, op, parsedRight.value);
//       const jsType = traceTypeOf(value);
//       return { value, jsType };
//     } catch (err) {
//       const message = err instanceof Error ? err.message : String(err);
//       return { error: message };
//     }
//   }, [parsedLeft, parsedRight, op]);

//   return (
//     <Container maxW="4xl" py={6} px={0}>
//       <Stack gap={3}>
//         <HStack align="center" gap={3}>
//           <Text fontWeight="semibold">ApplyStringOrNumericBinaryOperator</Text>
//           <Select value={op} onChange={(e) => setOp(e.target.value as Operator)} w="140px" size="sm">
//             {OPERATORS.map((o) => (
//               <option key={o} value={o}>
//                 {o}
//               </option>
//             ))}
//           </Select>
//           <Button size="sm" variant="outline" onClick={() => setOp("+")}>
//             Reset op
//           </Button>
//         </HStack>

//         <Stack direction={{ base: "column", md: "row" }} gap={3}>
//           <InputWithType label="lVal" state={left} onChange={setLeft} error={parsedLeft.error} />
//           <InputWithType label="rVal" state={right} onChange={setRight} error={parsedRight.error} />
//         </Stack>

//         <Divider />

//         {evaluation.error ? (
//           <Box p={3} border="1px solid" borderColor="red.700" bg="rgba(248, 113, 113, 0.08)" rounded="md">
//             <Text color="red.300" fontWeight="semibold">
//               Error
//             </Text>
//             <Text color="red.200" fontSize="sm" mt={1}>
//               {evaluation.error}
//             </Text>
//           </Box>
//         ) : (
//           <Box p={3} border="1px solid" borderColor="gray.700" bg="rgba(15, 23, 42, 0.8)" rounded="md">
//             <HStack justify="space-between" align="flex-start">
//               <Stack gap={1}>
//                 <Text fontSize="sm" color="gray.400">
//                   Result
//                 </Text>
//                 {evaluation.value !== undefined && <ValuePreview value={evaluation.value} />}
//               </Stack>
//               {evaluation.jsType && <ResultBadge label="Type" jsType={evaluation.jsType} />}
//             </HStack>
//           </Box>
//         )}
//       </Stack>
//     </Container>
//   );
// }
