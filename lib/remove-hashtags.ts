export default  function removeHashtags(input: string): string {
    // This regular expression matches hashtags.
    //const hashtagRegex = /#\w+/g;
    const hashtagRegex = /#(\w+)\b/g;

    let ret=input.replace(hashtagRegex, '');
    ret=input.replace(/\(\)/g, '');
    console.log("removeHashtags:",input,ret);
    return input.replace(hashtagRegex, '');
}
