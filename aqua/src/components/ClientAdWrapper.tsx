"use client";

import { useEffect, useRef } from "react";

export default function ClientAdWrapper({ scriptHtml }: { scriptHtml: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear previous content
        containerRef.current.innerHTML = '';

        // Create a temporary container to safely extract and execute scripts
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = scriptHtml;

        const scripts = tempDiv.getElementsByTagName("script");
        const scriptSources: string[] = [];

        // Extract script tags
        Array.from(scripts).forEach((oldScript) => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach((attr) => {
                newScript.setAttribute(attr.name, attr.value);
            });
            if (oldScript.innerHTML) {
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            }
            scriptSources.push(oldScript.src); // Keep track of src if needed for debugging
            containerRef.current?.appendChild(newScript);
        });

        // Append non-script HTML elements
        Array.from(tempDiv.children).forEach((child) => {
            if (child.tagName.toLowerCase() !== "script") {
                containerRef.current?.appendChild(child.cloneNode(true));
            }
        });

    }, [scriptHtml]);

    return <div ref={containerRef} className="w-full flex items-center justify-center" />;
}
