function wait(delayTime: number) {
    return new Promise((resolve) => setTimeout(resolve, delayTime));
}


const deepEqual = (obj1: object, obj2: object) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
}

export { wait, deepEqual };