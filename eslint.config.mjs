// @ts-check
import {createConfig} from '@floracodex/eslint-config/lib';

export default createConfig({
    rootDir: import.meta.dirname,
    tsconfigs: ['./tsconfig.json', './tsconfig.test.json']
});
