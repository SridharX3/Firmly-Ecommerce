
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/ws" | "/cart" | "/checkout" | "/login" | "/order" | "/order/success" | "/order/[checkout_id]" | "/products" | "/products/[id]" | "/register";
		RouteParams(): {
			"/order/[checkout_id]": { checkout_id: string };
			"/products/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { checkout_id?: string; id?: string };
			"/api": Record<string, never>;
			"/api/ws": Record<string, never>;
			"/cart": Record<string, never>;
			"/checkout": Record<string, never>;
			"/login": Record<string, never>;
			"/order": { checkout_id?: string };
			"/order/success": Record<string, never>;
			"/order/[checkout_id]": { checkout_id: string };
			"/products": { id?: string };
			"/products/[id]": { id: string };
			"/register": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/ws" | "/api/ws/" | "/cart" | "/cart/" | "/checkout" | "/checkout/" | "/login" | "/login/" | "/order" | "/order/" | "/order/success" | "/order/success/" | `/order/${string}` & {} | `/order/${string}/` & {} | "/products" | "/products/" | `/products/${string}` & {} | `/products/${string}/` & {} | "/register" | "/register/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/_redirects" | "/favicon.png" | string & {};
	}
}