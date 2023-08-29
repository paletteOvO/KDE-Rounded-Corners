#version 140

uniform sampler2D front;
uniform float radius;
uniform bool windowHasDecoration;
uniform vec2 windowSize;
uniform vec2 windowExpandedSize;
uniform vec2 windowTopLeft;
uniform vec4 shadowColor;
uniform float shadowSize;
uniform vec4 outlineColor;
uniform float outlineThickness;
uniform vec4 modulation;
uniform float saturation;

in vec2 texcoord0;
out vec4 fragColor;

bool isDrawingShadows() { return  windowHasDecoration && shadowColor.a > 0.0; }
bool isDrawingOutline() { return  outlineColor.a > 0.0 && outlineThickness > 0.0; }

float parametricBlend(float t) {
    float sqt = t * t;
    return sqt / (2.0 * (sqt - t) + 1.0);
}

float revSqBlend(float x) {
    // fit of reverse square
    // float a = 0.112372;
    // return 1 / (8 * (1 - x + a)) - a;
    float a = 0.059017;
    return 1 / (16 * (1 - x + a)) - a;
    // float a = 0.038516;
    // return 1 / (25 * (1 - x + a)) - a;

}

vec4 shadowCorner(float distance_from_center) {
    float percent = (shadowSize - distance_from_center) / shadowSize;
    if(percent < 0)
        return vec4(0,0,0,0);
    else {
        float a = revSqBlend(shadowColor.a * percent);
        return vec4(shadowColor.rgb * a, a);
    }
}

vec4 shapeCorner(vec2 coord0, vec4 tex, vec2 center) {
    float d = distance(coord0, center);
    float distance_from_edge = abs(d - radius);

    vec4 c = isDrawingShadows() ? shadowCorner(distance_from_edge) : vec4(0,0,0,0);

    if(isDrawingOutline()) {
        vec4 outlineOverlay = vec4(mix(tex.rgb, outlineColor.rgb, outlineColor.a), 1.0);

        if(d <= radius) {
            // within corner
            float antialiasing = clamp(distance_from_edge - (outlineThickness / 2.0), 0.0, 1.0);
            return mix(outlineOverlay, tex, antialiasing);
        } else {
            float antialiasing = clamp(distance_from_edge, 0.0, 1.0);
            return mix(outlineOverlay, c, antialiasing);
        }
    } else {
        if(d <= radius) {
            // within corner
            return tex;
        } else {
            float antialiasing = clamp(distance_from_edge, 0.0, 1.0);
            return mix(tex, c, antialiasing);
        }
    }
}

void main(void)
{
    vec4 tex = texture(front, texcoord0);
    vec2 coord0 = vec2(texcoord0.x * windowExpandedSize.x,
                    (1-texcoord0.y)* windowExpandedSize.y);

    if (coord0.y < windowTopLeft.y + radius) {
        if (coord0.x < windowTopLeft.x + radius) {
            // topLeft corner
            tex = shapeCorner(coord0, tex, vec2(windowTopLeft.x + radius, windowTopLeft.y + radius));
        } else if (coord0.x > windowTopLeft.x + windowSize.x - radius) {
            // topRight corner
            tex = shapeCorner(coord0, tex, vec2(windowTopLeft.x + windowSize.x - radius, windowTopLeft.y + radius));
        } else {
            // top
            tex = shapeCorner(coord0, tex, vec2(coord0.x, windowTopLeft.y + radius));
        }
    } else if (coord0.y > windowTopLeft.y + windowSize.y - radius) {
        if (coord0.x < windowTopLeft.x + radius) {
            // bottomLeft corner
            tex = shapeCorner(coord0, tex, vec2(windowTopLeft.x + radius, windowTopLeft.y + windowSize.y - radius));
        } else if (coord0.x > windowTopLeft.x + windowSize.x - radius) {
            // bottomRight corner
            tex = shapeCorner(coord0, tex, vec2(windowTopLeft.x + windowSize.x - radius, windowTopLeft.y + windowSize.y - radius));
        } else {
            // bottom
            tex = shapeCorner(coord0, tex, vec2(coord0.x, windowTopLeft.y + windowSize.y - radius));
        }
    } else {
        if (coord0.x < windowTopLeft.x + radius) {
            // left
            tex = shapeCorner(coord0, tex, vec2(windowTopLeft.x + radius, coord0.y));
        } else if (coord0.x > windowTopLeft.x + windowSize.x - radius) {
            // right
            tex = shapeCorner(coord0, tex, vec2(windowTopLeft.x + windowSize.x - radius, coord0.y));
        }
    }

    if (saturation != 1.0) {
        vec3 desaturated = tex.rgb * vec3( 0.30, 0.59, 0.11 );
        desaturated = vec3( dot( desaturated, tex.rgb ));
        tex.rgb = tex.rgb * vec3( saturation ) + desaturated * vec3( 1.0 - saturation );
    }
    tex *= modulation;

    fragColor = tex;
}
