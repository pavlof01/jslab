import Image from "next/image";

export type LogoLoaderProps = {
  size?: number;
};

export function LogoLoader({ size = 16 }: LogoLoaderProps) {
  return (
    <Image
      src="/jslab-logo.svg"
      alt=""
      aria-hidden="true"
      width={99}
      height={100}
      unoptimized
      style={{ display: "block", width: "auto", height: size }}
    />
  );
}
